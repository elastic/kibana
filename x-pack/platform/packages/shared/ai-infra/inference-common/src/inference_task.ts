/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base interface for all inference events.
 */
export interface InferenceTaskEventBase<TEventType extends string> {
  /**
   * Unique identifier of the event type.
   */
  type: TEventType;
}

export enum InferenceTaskEventType {
  error = 'error',
}

export type InferenceTaskEvent = InferenceTaskEventBase<string>;
