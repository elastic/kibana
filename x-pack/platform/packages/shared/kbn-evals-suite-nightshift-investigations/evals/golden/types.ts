/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { Evaluator } from '@kbn/evals';
import type { InvestigationStructuredOutput } from '@kbn/nightshift-investigations-plugin/common';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import { DOORDASH_ALERT_EVAL_CONSTRAINTS } from './prompts';

const answerSchema = z.string().min(1).max(100_000);
const expectedSchema = z
  .object({
    reference_answer: z.string().max(100_000).optional(),
    answer: z.string().max(100_000).optional(),
  })
  .catchall(z.json());

const metadataSchema = z
  .object({
    langsmith_example_id: z.string().min(1).max(500).optional(),
    source_kbn_example_id: z.string().min(1).max(500).optional(),
    case_id: z.string().min(1).max(500).optional(),
    category: z.string().max(500).optional(),
    max_latency_seconds: z.union([
      z.number().positive(),
      z
        .string()
        .max(100)
        .regex(/^(?=.*[1-9])(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/),
    ]),
    dataset_split: z.array(z.string().max(500)).max(100),
    status: z.string().max(100).optional(),
  })
  .catchall(z.json());

/**
 * One investigation example. The question must leave room for the eval constraints suffix the
 * task appends, and either a LangSmith id or a case id must identify the example.
 */
export const createInvestigationExampleSchema = (constraintsSuffixLength: number) =>
  z.object({
    input: z
      .object({
        question: z
          .string()
          .min(1)
          .max(MAX_TEXT_LENGTH - constraintsSuffixLength),
      })
      .catchall(z.json()),
    output: z.union([
      expectedSchema.extend({ reference_answer: answerSchema }),
      expectedSchema.extend({ answer: answerSchema }),
    ]),
    metadata: metadataSchema.refine(
      ({ langsmith_example_id: langsmithId, case_id: caseId }) => Boolean(langsmithId || caseId),
      { message: 'metadata needs langsmith_example_id or case_id' }
    ),
  });

export type InvestigationExample = z.infer<ReturnType<typeof createInvestigationExampleSchema>>;

const goldenBaseSchema = createInvestigationExampleSchema(DOORDASH_ALERT_EVAL_CONSTRAINTS.length);

/** The procurement contract: golden examples always carry their LangSmith id for comparison joins. */
export const goldenExampleSchema = goldenBaseSchema.extend({
  metadata: metadataSchema.extend({ langsmith_example_id: z.string().min(1).max(500) }),
});

export type GoldenExample = z.infer<typeof goldenExampleSchema>;

export interface TrajectoryStep {
  step_type: 'tool_call' | 'tool_result' | 'response' | 'progress';
  content: string;
  tool_name: string | null;
  tool_args: ToolCallStep['params'] | null;
  tool_output: string | null;
  success: boolean;
}

export interface GoldenTaskOutput {
  test_id: string;
  query: string;
  max_latency_seconds: number;
  metrics: Record<string, number>;
  latency_seconds: number;
  tool_names_invoked: string[];
  total_tool_calls: number;
  failed_tool_calls: number;
  final_answer: string;
  healthcheck: null;
  as_of_offset_minutes: null;
  as_of_ts: null;
  severity_truth: null;
  outcome_after_as_of: null;
  execution_error: string | null;
  trajectory: TrajectoryStep[];
  investigation_id: string | null;
  conversation_id: string | null;
  workflow_status: string | null;
  structured_report: InvestigationStructuredOutput | null;
  traceId?: string;
}

export type GoldenEvaluator = Evaluator<InvestigationExample, GoldenTaskOutput>;
