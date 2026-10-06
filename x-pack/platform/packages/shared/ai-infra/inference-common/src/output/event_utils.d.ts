/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import type { OutputCompleteEvent, OutputEvent, OutputUpdateEvent } from '.';
import type { InferenceTaskEvent } from '../inference_task';
/**
 * Check if the provided {@link ChatCompletionEvent} is a {@link ChatCompletionChunkEvent}
 */
export declare function isOutputCompleteEvent<TOutputEvent extends OutputEvent>(
  event: TOutputEvent
): event is Extract<TOutputEvent, OutputCompleteEvent>;
/**
 * Check if the provided {@link InferenceTaskEvent} is a {@link OutputEvent}
 */
export declare function isOutputEvent(event: InferenceTaskEvent): event is OutputEvent;
/**
 * Check if the provided {@link OutputEvent} is a {@link OutputUpdateEvent}
 */
export declare function isOutputUpdateEvent<TId extends string>(
  event: OutputEvent
): event is OutputUpdateEvent<TId>;
/**
 * Operator filtering out the update events from the provided observable.
 */
export declare function withoutOutputUpdateEvents<T extends OutputEvent>(): OperatorFunction<
  T,
  Exclude<T, OutputUpdateEvent>
>;
