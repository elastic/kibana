/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { catchError, concat, of, throwError } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { RoundInterruptedEvent } from '@kbn/agent-builder-common';

/**
 * When the source errors, emits one `round_interrupted` event built at that moment, then
 * re-throws the original error. Building the event is best effort: if it throws, the failure is
 * logged and the original error is re-thrown alone, so an interruption summary can never mask the
 * error that caused it.
 */
export const emitRoundInterruptedOnError = <T>({
  buildEvent,
  logger,
}: {
  buildEvent: () => RoundInterruptedEvent;
  logger: Logger;
}): OperatorFunction<T, T | RoundInterruptedEvent> =>
  catchError((err) => {
    let interrupted: RoundInterruptedEvent;
    try {
      interrupted = buildEvent();
    } catch (summaryError) {
      logger.warn(
        `Failed to build round_interrupted summary: ${
          summaryError instanceof Error ? summaryError.message : String(summaryError)
        }`
      );
      return throwError(() => err);
    }
    return concat(
      of(interrupted),
      throwError(() => err)
    );
  });
