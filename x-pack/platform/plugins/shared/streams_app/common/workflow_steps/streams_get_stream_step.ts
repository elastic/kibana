/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const StreamsGetStreamStepTypeId = 'streams.getStream';

export const InputSchema = z.object({
  name: z.string().describe('The name of the stream to retrieve'),
});

export const OutputSchema = z.object({
  stream: z.record(z.string(), z.unknown()),
});

export type StreamsGetStreamStepInputSchema = typeof InputSchema;
export type StreamsGetStreamStepOutputSchema = typeof OutputSchema;

export const streamsGetStreamStepCommonDefinition: CommonStepDefinition<
  StreamsGetStreamStepInputSchema,
  StreamsGetStreamStepOutputSchema
> = {
  id: StreamsGetStreamStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
