/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromEvent, of, takeUntil, type MonoTypeOperatorFunction } from 'rxjs';

/**
 * Completes the source when `signal` aborts (immediately if it is already aborted).
 * Unsubscribing from the source cancels its in-flight HTTP request.
 */
export function takeUntilAborted<T>(signal: AbortSignal | undefined): MonoTypeOperatorFunction<T> {
  if (!signal) {
    return (source) => source;
  }
  return takeUntil(signal.aborted ? of(undefined) : fromEvent(signal, 'abort'));
}
