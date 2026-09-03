/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM } from '../../common/constants';
import type { AiIndexSignalTimeRange } from '../../common/http_api/ai_indices';
import { InvalidSignalWindowError } from './errors';

/**
 * Resolves the configured signal window to two concrete timestamps.
 *
 * Date math is evaluated once, here, rather than handed to Elasticsearch as `now-30d`. The
 * selection issues more than one query and the result is recorded as an improvement's provenance,
 * so a window that drifted between those uses would make the recorded evidence not quite match the
 * evidence actually read.
 */
export const resolveSignalWindow = (
  range: AiIndexSignalTimeRange | undefined,
  now: Date = new Date()
): { from: string; to: string } => {
  const to = now.toISOString();

  if (range?.type === 'absolute') {
    return { from: range.from, to };
  }

  const expression = range?.from ?? DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM;
  const parsed = dateMath.parse(expression, { forceNow: now });
  if (!parsed?.isValid()) {
    throw new InvalidSignalWindowError(
      `Could not resolve the signal window from '${expression}'. Expected date math such as 'now-30d'.`
    );
  }

  return { from: parsed.toISOString(), to };
};
