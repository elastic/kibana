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

/**
 * Which samples to evaluate. A sample is a question with the conversations it is asked over: its
 * haystack. The listed `samples` win; else every sample with `all_samples`; else the first
 * `sample_count`.
 */
const sampleSelectionShape = (allSamples: boolean, perSample: boolean) => ({
  samples: z.array(z.string()).default([]),
  /** Picks the samples of one of `presets`, unless `samples` lists some. */
  preset: z.string().optional(),
  /** Named lists of sample ids, so runs across the team evaluate the same samples. */
  presets: z.record(z.string(), z.array(z.string()).min(1)).default({}),
  sample_count: z.number().int().min(1).default(1),
  all_samples: z.boolean().default(allSamples),
  /**
   * Runs the samples one at a time, each with only its own conversations: the run stage imports
   * a sample's conversations, dreams on them from a clean AI index, and dumps its KIs, then goes on
   * to the next. The evaluate and ask stages then work per sample too.
   */
  per_sample: z.boolean().default(perSample),
});

const longMemEvalSSchema = z.object({
  url: z
    .string()
    .default(
      'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json'
    ),
  agent: agentSchema.default({ id: 'longmemeval-assistant', name: 'Personal assistant' }),
  /** Each question has its own haystack, so each sample learns from its own conversations. */
  ...sampleSelectionShape(false, true),
  include_abstention: z.boolean().default(false),
  /**
   * The sessions imported per sample: its whole haystack (about 50), or only those that hold the
   * answer and `distractor_sessions` more, for a quicker run.
   */
  sessions: z.enum(['haystack', 'answers']).default('haystack'),
  distractor_sessions: z.number().int().min(0).default(1),
});

const longMemEvalV2Schema = z.object({
  base_url: z
    .string()
    .default('https://huggingface.co/datasets/xiaowu0162/longmemeval-v2/resolve/main'),
  agent: agentSchema.default({ id: 'workarena-agent', name: 'ServiceNow agent' }),
  /** In the small tier every enterprise question shares one haystack, so all of them cost no more. */
  ...sampleSelectionShape(true, false),
  haystack: z.enum(['small', 'medium']).default('small'),
  /** Imports only the first trajectories of the samples' haystacks, for a quicker run. */
  max_trajectories: z.number().int().min(1).optional(),
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

export const DEFAULT_ANSWER_AGENT_TOOLS = [
  'platform.context_engine.list_ai_indices',
  'platform.context_engine.describe_ai_index',
  'platform.context_engine.query_ai_indices',
];

/** The Agent Builder agent the ask stage puts the targets' questions to, with only the AI index. */
const answerAgentSchema = z.object({
  enabled: z.boolean().default(true),
  /** Defaults to `<AI index id>-answerer`. */
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .optional(),
  /** Defaults to instructions that send the agent to the AI index for everything it knows. */
  instructions: z.string().optional(),
  tools: z.array(z.string()).default(DEFAULT_ANSWER_AGENT_TOOLS),
});

const aiIndexSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  description: z.string().optional(),
  datasets: z.array(z.enum(DATASET_NAMES)).min(1),
  dreaming: dreamingSchema,
  /** Target files to evaluate against; when empty, the targets extracted for its datasets. */
  targets: z.array(z.string()).default([]),
  answer_agent: answerAgentSchema.default(answerAgentSchema.parse({})),
});

const configSchema = z.object({
  space: z.string().default('default'),
  /** Where downloads, extracted datasets and runs go, relative to the Kibana repo root. */
  data_dir: z.string().default('data/context_engine_dreaming_eval'),
  /** The data stream spans are written to; defaults to Agent Builder's for the space. */
  traces_index: z.string().optional(),
  /** Dreaming schedule of the eval AI indices; long, so scheduled runs stay out of the way. */
  schedule_interval: z.string().default('7d'),
  /** The datasets to evaluate: the stages work on the AI indices that dream on only these. */
  run_datasets: z.array(z.enum(DATASET_NAMES)).min(1).default(['longmemeval_s']),
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
      /** Times in a row a run that fails is run again; it resumes from the last completed run. */
      retries: z.number().int().min(0).default(2),
      execution_timeout_minutes: z.number().min(1).default(40),
    })
    .default({ max_runs_per_workflow: 50, retries: 2, execution_timeout_minutes: 40 }),
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
  ask: z
    .object({
      /** Runs the ask stage with the others when no --stage is given. */
      enabled: z.boolean().default(false),
      /** The connector the answer agents answer with; else Agent Builder's default. */
      connector_id: z.string().optional(),
      concurrency: z.number().int().min(1).default(2),
      timeout_minutes: z.number().min(1).default(10),
    })
    .default({ enabled: false, concurrency: 2, timeout_minutes: 10 }),
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

/**
 * The AI indices to work on: the listed ones, else those whose datasets are all among `datasets`
 * (the config's `run_datasets` unless given).
 */
export const selectAiIndexIds = (
  config: EvalConfig,
  {
    aiIndexIds,
    datasets = config.run_datasets,
  }: { aiIndexIds?: string[]; datasets?: DatasetName[] }
): string[] => {
  const all = config.ai_indices.map(({ id }) => id);
  if (aiIndexIds && aiIndexIds.length > 0) {
    const unknown = aiIndexIds.filter((id) => !all.includes(id));
    if (unknown.length > 0) {
      throw new Error(`The config has no AI index ${unknown.join(', ')}`);
    }
    return aiIndexIds;
  }
  const selected = config.ai_indices
    .filter((aiIndex) => aiIndex.datasets.every((dataset) => datasets.includes(dataset)))
    .map(({ id }) => id);
  if (selected.length === 0) {
    throw new Error(`No AI index of the config dreams on only ${datasets.join(', ')}`);
  }
  return selected;
};

/** Sample overrides from the command line, applied to every dataset the run uses. */
export interface SampleOverrides {
  samples?: string[];
  preset?: string;
  sampleCount?: number;
  allSamples?: boolean;
  perSample?: boolean;
}

export const withSampleOverrides = (
  config: EvalConfig,
  datasets: DatasetName[],
  { samples, preset, sampleCount, allSamples, perSample }: SampleOverrides
): EvalConfig => {
  if ((samples || preset) && datasets.length > 1) {
    throw new Error(
      `Sample ids and presets belong to one dataset: pick it with --dataset (the run uses ${datasets.join(
        ', '
      )})`
    );
  }
  const override = <
    T extends {
      samples: string[];
      preset?: string;
      sample_count: number;
      all_samples: boolean;
      per_sample: boolean;
    }
  >(
    selection: T
  ): T => ({
    ...selection,
    ...(samples && { samples }),
    ...(preset && { preset, samples: [] }),
    ...(sampleCount !== undefined && { sample_count: sampleCount, all_samples: false }),
    ...(allSamples && { all_samples: true }),
    ...(perSample && { per_sample: true }),
  });
  return {
    ...config,
    datasets: {
      longmemeval_s: datasets.includes('longmemeval_s')
        ? override(config.datasets.longmemeval_s)
        : config.datasets.longmemeval_s,
      longmemeval_v2_enterprise: datasets.includes('longmemeval_v2_enterprise')
        ? override(config.datasets.longmemeval_v2_enterprise)
        : config.datasets.longmemeval_v2_enterprise,
    },
  };
};

export const destOf = (aiIndexId: string): string => `${AI_INDEX_INDEX_PREFIX}${aiIndexId}`;

export interface AnswerAgent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tools: string[];
}

/** The answer agent of an AI index: told that what it knows is in the AI index, and given only it. */
export const answerAgentOf = ({
  id: aiIndexId,
  description,
  answer_agent: agent,
}: AiIndexEvalConfig): AnswerAgent => ({
  id: agent.id ?? `${aiIndexId}-answerer`,
  name: `${aiIndexId} answerer`,
  description: `Answers from what dreaming wrote to the AI Index ${aiIndexId}, for the dreaming eval.`,
  tools: agent.tools,
  instructions:
    agent.instructions ??
    [
      `Everything you know from past conversations is stored in the AI Index \`${aiIndexId}\` (ES|QL target \`${destOf(
        aiIndexId
      )}\`)${description ? `: ${description}` : '.'}`,
      '',
      'The answer to every question you are asked is in that AI Index. Search it before you answer, every time, and answer from what you find there, not from general knowledge. Try more than one search: other wordings, the names and terms in the question, and the related facts and entities a first search turns up. When a question is about time, use the dates the facts carry.',
      '',
      'If the AI Index does not hold the answer after a thorough search, say that you do not know rather than guess. Keep the answer short and direct, and follow any answer format the question asks for.',
    ].join('\n'),
});

/** Where an AI index's KI dumps and evaluations of one run go. */
export const runDirOf = (config: EvalConfig, runId: string, aiIndexId: string): string =>
  path.join(config.dataDir, 'runs', runId, aiIndexId);

export const datasetDirOf = (config: EvalConfig, dataset: DatasetName): string =>
  path.join(config.dataDir, dataset);
