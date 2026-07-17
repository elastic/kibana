/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { z } from '@kbn/zod/v4';

export const processorEventSchema = z.union([
  z.literal(ProcessorEvent.transaction),
  z.literal(ProcessorEvent.error),
  z.literal(ProcessorEvent.metric),
  z.literal(ProcessorEvent.span),
]);

/**
 * Processor events that are searchable in the UI via the query bar.
 *
 * Some client-side routes will define 1 or more processor events that
 * will be used to fetch the dynamic data view for the query bar.
 */
export type UIProcessorEvent =
  | ProcessorEvent.transaction
  | ProcessorEvent.error
  | ProcessorEvent.metric;
