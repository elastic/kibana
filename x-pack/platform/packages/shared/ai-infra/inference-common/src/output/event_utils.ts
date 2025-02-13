/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction } from 'rxjs';
import { OutputCompleteEvent, OutputEvent, OutputEventType, OutputUpdateEvent } from '.';
import type { InferenceTaskEvent } from '../inference_task';

/**
 * Check if the provided {@link ChatCompletionEvent} is a {@link ChatCompletionChunkEvent}
 */
export function isOutputCompleteEvent<TOutputEvent extends OutputEvent>(
  event: TOutputEvent
): event is Extract<TOutputEvent, OutputCompleteEvent> {
  return event.type === OutputEventType.OutputComplete;
}

/**
 * Check if the provided {@link InferenceTaskEvent} is a {@link OutputEvent}
 */
export function isOutputEvent(event: InferenceTaskEvent): event is OutputEvent {
  return (
    event.type === OutputEventType.OutputComplete || event.type === OutputEventType.OutputUpdate
  );
}

/**
 * Check if the provided {@link OutputEvent} is a {@link OutputUpdateEvent}
 */
export function isOutputUpdateEvent<TId extends string>(
  event: OutputEvent
): event is OutputUpdateEvent<TId> {
  return event.type === OutputEventType.OutputComplete;
}

/**
 * Operator filtering out the update events from the provided observable.
 */
export function withoutOutputUpdateEvents<T extends OutputEvent>(): OperatorFunction<
  T,
  Exclude<T, OutputUpdateEvent>
> {
  return filter(
    (event): event is Exclude<T, OutputUpdateEvent> => event.type !== OutputEventType.OutputUpdate
  );
}
