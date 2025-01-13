/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskEventBase } from '../inference_task';

/**
 * List possible values of {@link OutputEvent} types.
 */
export enum OutputEventType {
  OutputUpdate = 'output',
  OutputComplete = 'complete',
}

/**
 * Task output of a {@link OutputCompleteEvent}
 */
export type Output = Record<string, any> | undefined | unknown;

/**
 * Update (chunk) event for the {@link OutputAPI}
 */
export type OutputUpdateEvent<TId extends string = string> =
  InferenceTaskEventBase<OutputEventType.OutputUpdate> & {
    /**
     * The id of the operation, as provided as input
     */
    id: TId;
    /**
     * The text content of the chunk
     */
    content: string;
  };

/**
 * Completion (complete message) event for the {@link OutputAPI}
 */
export type OutputCompleteEvent<
  TId extends string = string,
  TOutput extends Output = Output
> = InferenceTaskEventBase<OutputEventType.OutputComplete> & {
  /**
   * The id of the operation, as provided as input
   */
  id: TId;
  /**
   * The task output, following the schema specified as input
   */
  output: TOutput;
  /**
   * Potential text content provided by the LLM,
   * if it was provided in addition to the tool call
   */
  content: string;
};

/**
 * Events emitted from the {@link OutputEvent}.
 */
export type OutputEvent<TId extends string = string, TOutput extends Output = Output> =
  | OutputUpdateEvent<TId>
  | OutputCompleteEvent<TId, TOutput>;
