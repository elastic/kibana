/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  DEFAULT_SIGNALS_PAGE_SIZE,
  SIGNALS_INTERNAL_API_VERSION,
  signalGroupsPath,
  signalsPath,
} from '../../../common/constants';
import type {
  ListSignalGroupsResponse,
  ListSignalsResponse,
} from '../../../common/http_api/signals';
import type { AnalyzeAndImproveContext, ChatOpener } from '../../types';

interface ListSignalGroupsArgs {
  signal?: AbortSignal;
}

/** Fetches the preaggregated grouped-by-tag Signals list. */
export const listSignalGroups = (
  http: HttpStart,
  { signal }: ListSignalGroupsArgs = {}
): Promise<ListSignalGroupsResponse> =>
  http.get<ListSignalGroupsResponse>(signalGroupsPath, {
    version: SIGNALS_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

interface ListSignalsArgs {
  tag: string;
  from?: number;
  size?: number;
  signal?: AbortSignal;
}

/** Fetches the individual signals carrying a given tag (paginated). */
export const listSignals = (
  http: HttpStart,
  { tag, from = 0, size = DEFAULT_SIGNALS_PAGE_SIZE, signal }: ListSignalsArgs
): Promise<ListSignalsResponse> =>
  http.get<ListSignalsResponse>(signalsPath, {
    version: SIGNALS_INTERNAL_API_VERSION,
    query: { tag, from, size },
    ...(signal ? { signal } : {}),
  });

/**
 * Invokes the registered "Analyze & improve" chat opener. No-op when no opener is registered
 * (the button that triggers this is hidden in that case). The opener itself is provided by a
 * separate PR (search-team #15593).
 */
export const analyzeAndImprove = (
  opener: ChatOpener | undefined,
  context: AnalyzeAndImproveContext
): void => {
  opener?.(context);
};
