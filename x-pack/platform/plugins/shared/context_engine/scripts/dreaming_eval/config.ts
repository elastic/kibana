/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { z } from '@kbn/zod/v4';
import type { AiIndexDreamingConfig } from '../../common/dreaming';
import { AI_INDEX_INDEX_PREFIX } from '../../common/constants';

export const DATASET_NAMES = ['longmemeval_s', 'longmemeval_v2_enterprise'] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const longMemEvalSSchema = z.object({
  url: z
    .string()
    .default(
      'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json'
    ),
  agent: agentSchema.default({ id: 'longmemeval-assistant', name: 'Personal assistant' }),
  /** Questions to take; when empty, `questions_per_type` of each question type are taken. */
  question_ids: z.array(z.string()).default([]),
  questions_per_type: z.number().int().min(0).default(1),
  include_abstention: z.boolean().default(false),
  /** Sessions without the answer added per question, taken in haystack order. */
  distractor_sessions: z.number().int().min(0).default(1),
});

const longMemEvalV2Schema = z.object({
  base_url: z
    .string()
    .default('https://huggingface.co/datasets/xiaowu0162/longmemeval-v2/resolve/main'),
  agent: agentSchema.default({ id: 'workarena-agent', name: 'ServiceNow agent' }),
  haystack: z.enum(['small', 'medium']).default('small'),
  /** The first trajectories of the enterprise haystack to import. */
  trajectories: z.number().int().min(1).default(100),
  /** Characters kept of each page the agent saw. */
  max_observation_chars: z.number().int().min(0).default(600),
  include_abstention: z.boolean().default(false),
  include_image_questions: z.boolean().default(false),
  /** Trajectories carry no times; the first one starts here and each next one an hour later. */
  start_time: z.string().default('2026-01-05T09:00:00.000Z'),
});

const dreamingSchema = z
  .object({
    /** A built-in dreaming template, from `public/assets/dreaming_templates/<name>.json`. */
    template: z.string().optional(),
    instructions: z.string().optional(),
    schedule: z.object({ interval: z.string() }).optional(),
    facts: z.array(z.object({ type: z.string(), description: z.string().optional() })).optional(),
    entities: z
      .object({
        nodes: z.array(
          z.object({
            type: z.string(),
            description: z.string().optional(),
            attributes: z.array(z.string()).optional(),
          })
        ),
      })
      .optional(),
    relationships: z
      .array(z.object({ type: z.string(), description: z.string().optional() }))
      .optional(),
  })
  .refine(({ template, facts, entities }) => template || facts || entities, {
    message: 'dreaming needs a template, facts or entities',
  });

const aiIndexSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  description: z.string().optional(),
  datasets: z.array(z.enum(DATASET_NAMES)).min(1),
  dreaming: dreamingSchema,
  /** Target files to evaluate against; when empty, the targets extracted for its datasets. */
  targets: z.array(z.string()).default([]),
});

const configSchema = z.object({
  space: z.string().default('default'),
  /** Where downloads, extracted datasets and runs go, relative to the Kibana repo root. */
  data_dir: z.string().default('data/context_engine_dreaming_eval'),
  /** The data stream spans are written to; defaults to Agent Builder's for the space. */
  traces_index: z.string().optional(),
  /** Dreaming schedule of the eval AI indices; long, so scheduled runs stay out of the way. */
  schedule_interval: z.string().default('7d'),
  datasets: z
    .object({
      longmemeval_s: longMemEvalSSchema.default(longMemEvalSSchema.parse({})),
      longmemeval_v2_enterprise: longMemEvalV2Schema.default(longMemEvalV2Schema.parse({})),
    })
    .default({
      longmemeval_s: longMemEvalSSchema.parse({}),
      longmemeval_v2_enterprise: longMemEvalV2Schema.parse({}),
    }),
  ai_indices: z.array(aiIndexSchema).min(1),
  run: z
    .object({
      /** Runs of one workflow at most, each reading the next batch of rounds or memories. */
      max_runs_per_workflow: z.number().int().min(1).default(50),
      execution_timeout_minutes: z.number().min(1).default(40),
    })
    .default({ max_runs_per_workflow: 50, execution_timeout_minutes: 40 }),
  evaluate: z
    .object({
      /** The connector of the judge; else Kibana's default AI connector, else the first one. */
      connector_id: z.string().optional(),
      rerank_inference_id: z.string().default('.rerank-v1-elasticsearch'),
      /** KIs shown to the judge per target, the ones the reranker ranks highest. */
      candidates: z.number().int().min(1).default(10),
      concurrency: z.number().int().min(1).default(4),
    })
    .default({ rerank_inference_id: '.rerank-v1-elasticsearch', candidates: 10, concurrency: 4 }),
});

export type EvalConfigFile = z.infer<typeof configSchema>;
export type AiIndexEvalConfig = z.infer<typeof aiIndexSchema>;
export type LongMemEvalSConfig = z.infer<typeof longMemEvalSSchema>;
export type LongMemEvalV2Config = z.infer<typeof longMemEvalV2Schema>;

export interface EvalConfig extends EvalConfigFile {
  /** Absolute paths. */
  dataDir: string;
  configDir: string;
  tracesIndex: string;
}

export const DEFAULT_CONFIG_PATH = path.resolve(__dirname, 'config/default.yaml');

const TEMPLATES_DIR = path.resolve(__dirname, '../../public/assets/dreaming_templates');

/** Parses a config file; paths in it are relative to the repo root (the working directory). */
export const parseConfig = (text: string, configPath: string, repoRoot: string): EvalConfig => {
  const parsed = configSchema.safeParse(yaml.parse(text));
  if (!parsed.success) {
    throw new Error(`Invalid config ${configPath}:\n${z.prettifyError(parsed.error)}`);
  }
  const ids = parsed.data.ai_indices.map(({ id }) => id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) {
    throw new Error(`Invalid config ${configPath}: AI index '${duplicate}' is listed twice`);
  }
  return {
    ...parsed.data,
    dataDir: path.resolve(repoRoot, parsed.data.data_dir),
    configDir: path.dirname(configPath),
    tracesIndex: parsed.data.traces_index ?? `traces-agent_builder.otel-${parsed.data.space}`,
  };
};

export const loadConfig = (configPath: string, repoRoot: string): EvalConfig =>
  parseConfig(fs.readFileSync(configPath, 'utf8'), configPath, repoRoot);

/** The dreaming config to store on an AI index: its template, overridden by what the file sets. */
export const resolveDreaming = (
  { template, ...overrides }: AiIndexEvalConfig['dreaming'],
  scheduleInterval: string,
  readTemplate: (name: string) => unknown = (name) =>
    JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.json`), 'utf8'))
): AiIndexDreamingConfig => {
  const base = template
    ? (readTemplate(template) as { dreaming?: Partial<AiIndexDreamingConfig> }).dreaming ?? {}
    : {};
  return {
    ...base,
    ...overrides,
    enabled: true,
    schedule: overrides.schedule ?? { interval: scheduleInterval },
  };
};

export const destOf = (aiIndexId: string): string => `${AI_INDEX_INDEX_PREFIX}${aiIndexId}`;

/** Where an AI index's KI dumps and evaluations of one run go. */
export const runDirOf = (config: EvalConfig, runId: string, aiIndexId: string): string =>
  path.join(config.dataDir, 'runs', runId, aiIndexId);

export const datasetDirOf = (config: EvalConfig, dataset: DatasetName): string =>
  path.join(config.dataDir, dataset);
