/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/apm-types-shared';
import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export const processorEventRt = t.union([
  t.literal(ProcessorEvent.transaction),
  t.literal(ProcessorEvent.error),
  t.literal(ProcessorEvent.metric),
  t.literal(ProcessorEvent.span),
]);

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
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
