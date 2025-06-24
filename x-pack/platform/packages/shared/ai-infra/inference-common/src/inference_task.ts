/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ServerSentEventBase } from '@kbn/sse-utils';

/**
 * Base interface for all inference events.
 */
export type InferenceTaskEventBase<
  TEventType extends string,
  TData extends Record<string, any>
> = ServerSentEventBase<TEventType, TData>;

export enum InferenceTaskEventType {
  error = 'error',
}

export type InferenceTaskEvent = InferenceTaskEventBase<string, Record<string, unknown>>;
