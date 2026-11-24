/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ServerStepDefinition } from './types';
import type { CommonStepDefinition, StepExposure } from '../../common';

type JsonSchema = z.core.JSONSchema.JSONSchema;
type StepStability = NonNullable<CommonStepDefinition['stability']>;

/** Custom steps without a `stability` show as tech preview (see `BaseStepDefinition.stability`). */
const DEFAULT_STEP_STABILITY: StepStability = 'tech_preview';
/** Custom steps without an `exposure` are open to any workflow (see `StepExposure`). */
const DEFAULT_STEP_EXPOSURE: StepExposure = 'open';

/**
 * The part of a step definition that workflows depend on: what a workflow writes in the step,
 * what later steps read from its output, and which workflows may use it. Labels, descriptions,
 * documentation and handlers aren't part of it.
 */
export interface StepContract {
  id: string;
  stability: StepStability;
  exposure: StepExposure;
  deprecation?: CommonStepDefinition['deprecation'];
  /** The `with` block, as a workflow writes it. */
  input: JsonSchema;
  /** The step-level config properties, as a workflow writes them. */
  config?: JsonSchema;
  /** The output, as later steps read it. */
  output: JsonSchema;
}

// Input and config are read as the workflow writes them (`io: 'input'`), so a field with a
// default isn't required. The OpenAPI 3.0 target lets the contract check diff them with oasdiff.
// Parts JSON Schema can't represent (transforms, dates) become `{}` instead of throwing.
// A schema used in several places is written once, in `definitions`, which makes the
// contracts of steps that reuse large schemas (such as detection rules) about 4x smaller.
const toJsonSchema = (schema: z.ZodType, io: 'input' | 'output'): JsonSchema =>
  z.toJSONSchema(schema, { io, target: 'openapi-3.0', unrepresentable: 'any', reused: 'ref' });

/** Serializes the contract of a step definition, resolving the defaults of optional metadata. */
export const buildStepContract = ({
  id,
  stability,
  exposure,
  deprecation,
  inputSchema,
  configSchema,
  outputSchema,
}: ServerStepDefinition): StepContract => ({
  id,
  stability: stability ?? DEFAULT_STEP_STABILITY,
  exposure: exposure ?? DEFAULT_STEP_EXPOSURE,
  ...(deprecation ? { deprecation } : {}),
  input: toJsonSchema(inputSchema, 'input'),
  ...(configSchema ? { config: toJsonSchema(configSchema, 'input') } : {}),
  output: toJsonSchema(outputSchema, 'output'),
});
