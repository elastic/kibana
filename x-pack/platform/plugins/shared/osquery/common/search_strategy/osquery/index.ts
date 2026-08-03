/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest } from '@kbn/search-types';
import type {
  ActionsStrategyResponse,
  ActionsRequestOptions,
  ActionDetailsStrategyResponse,
  ActionDetailsRequestOptions,
  ActionResultsStrategyResponse,
  ActionResultsRequestOptions,
} from './actions';
import type { ResultsStrategyResponse, ResultsRequestOptions } from './results';
import type {
  ScheduledActionResultsStrategyResponse,
  ScheduledActionResultsRequestOptions,
} from './scheduled_action_results';
import type { ExportResultsStrategyResponse, ExportResultsRequestOptions } from './export_results';

import type { SortField, PaginationInputPaginated } from '../common';

export type * from './actions';
export type * from './results';
export type * from './scheduled_action_results';
export type * from './export_results';

export enum OsqueryQueries {
  actions = 'actions',
  actionDetails = 'actionDetails',
  actionResults = 'actionResults',
  results = 'results',
  scheduledActionResults = 'scheduledActionResults',
  exportResults = 'osquery.exportResults',
}

export type FactoryQueryTypes = OsqueryQueries;

export interface RequestBasicOptions extends IEsSearchRequest {
  kuery?: string;
  factoryQueryType?: FactoryQueryTypes;
  componentTemplateExists?: boolean;
  ccsEnabled?: boolean;
}

/** A mapping of semantic fields to their document counterparts */

export type RequestOptions = RequestBasicOptions;

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  sort: SortField<Field>;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends OsqueryQueries.actions
  ? ActionsStrategyResponse
  : T extends OsqueryQueries.actionDetails
  ? ActionDetailsStrategyResponse
  : T extends OsqueryQueries.actionResults
  ? ActionResultsStrategyResponse
  : T extends OsqueryQueries.results
  ? ResultsStrategyResponse
  : T extends OsqueryQueries.scheduledActionResults
  ? ScheduledActionResultsStrategyResponse
  : T extends OsqueryQueries.exportResults
  ? ExportResultsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends OsqueryQueries.actions
  ? ActionsRequestOptions
  : T extends OsqueryQueries.actionDetails
  ? ActionDetailsRequestOptions
  : T extends OsqueryQueries.actionResults
  ? ActionResultsRequestOptions
  : T extends OsqueryQueries.results
  ? ResultsRequestOptions
  : T extends OsqueryQueries.scheduledActionResults
  ? ScheduledActionResultsRequestOptions
  : T extends OsqueryQueries.exportResults
  ? ExportResultsRequestOptions
  : never;
