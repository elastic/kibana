/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '../queries/episodes_query';
import type { HistogramEpisodeRow } from '../utils/histogram_utils';
import type { EpisodeAction } from '../actions/types';
import type { EpisodeActionsDeps } from '../actions/create_episode_actions';

export interface EpisodeDataSourceServices {
  http: HttpStart;
}

interface EpisodeDataSourceBaseParams {
  services: EpisodeDataSourceServices;
  abortSignal?: AbortSignal;
}

export interface FetchSourceEpisodesParams extends EpisodeDataSourceBaseParams {
  pageSize: number;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
}

export interface FetchSourceKpisParams extends EpisodeDataSourceBaseParams {
  filterState?: EpisodesFilterState;
  timeRange?: TimeRange | null;
}

export interface FetchSourceHistogramParams extends EpisodeDataSourceBaseParams {
  filterState?: EpisodesFilterState;
  timeRange?: TimeRange | null;
  breakdownField?: string;
}

export interface FetchSourceTagOptionsParams extends EpisodeDataSourceBaseParams {
  timeRange?: TimeRange | null;
}

export interface ResolveSourceRulesParams extends EpisodeDataSourceBaseParams {
  ids: string[];
}

export interface EpisodeSourceKpis {
  alerts_count: number;
  firing_rules: number;
  assigned_to_me: number;
  unassigned: number;
  acknowledged: number;
  snoozed: number;
}

export interface EpisodeSourceHistogram {
  rows: HistogramEpisodeRow[];
  isCapHit: boolean;
}

export interface SourceActionResult {
  succeeded: number;
  failed: number;
  errors?: string[];
}

/**
 * Extension that a data source registers to participate in a common episode action.
 */
export interface EpisodeActionExtension<TContext = void> {
  actionId: string;
  isCompatible: (ep: AlertEpisode) => boolean;
  execute: (
    episodes: AlertEpisode[],
    http: HttpStart,
    context?: TContext
  ) => Promise<SourceActionResult>;
}

export interface EpisodeDataSource {
  id: string;
  queryKeyPrefix: readonly unknown[];
  fetchEpisodes: (params: FetchSourceEpisodesParams) => Promise<AlertEpisode[]>;
  fetchKpis?: (params: FetchSourceKpisParams) => Promise<EpisodeSourceKpis>;
  fetchHistogram?: (params: FetchSourceHistogramParams) => Promise<EpisodeSourceHistogram>;
  fetchTagOptions?: (params: FetchSourceTagOptionsParams) => Promise<string[]>;
  resolveRules?: (params: ResolveSourceRulesParams) => Promise<RuleResponse[]>;
  actionExtensions?: Array<EpisodeActionExtension<any>>;
  createActions?: (deps: EpisodeActionsDeps) => EpisodeAction[];
}
