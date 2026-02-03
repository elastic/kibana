/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const StreamsListFeaturesStepTypeId = 'streams.listFeatures';

export const InputSchema = z.object({
  name: z.string().describe('The name of the stream to list features for'),
  type: z.string().optional().describe('Optional feature type to filter by'),
});

export const OutputSchema = z.object({
  features: z.array(z.record(z.string(), z.unknown())),
});

export type StreamsListFeaturesStepInputSchema = typeof InputSchema;
export type StreamsListFeaturesStepOutputSchema = typeof OutputSchema;

export const streamsListFeaturesStepCommonDefinition: CommonStepDefinition<
  StreamsListFeaturesStepInputSchema,
  StreamsListFeaturesStepOutputSchema
> = {
  id: StreamsListFeaturesStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
