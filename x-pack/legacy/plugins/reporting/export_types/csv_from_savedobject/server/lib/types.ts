/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '../../../../common/cancellation_token';
import { SearchRequest } from '../../';

export interface SavedSearchGeneratorResult {
  content: string;
  maxSizeReached: boolean;
  size: number;
}

export interface CsvResultFromSearch {
  type: string;
  result: SavedSearchGeneratorResult;
}

type EndpointCaller = (method: string, params: any) => Promise<any>;
type FormatsMap = Map<
  string,
  {
    id: string;
    params: {
      pattern: string;
    };
  }
>;

export interface GenerateCsvParams {
  searchRequest: SearchRequest;
  callEndpoint: EndpointCaller;
  fields: string[];
  formatsMap: FormatsMap;
  metaFields: string[]; // FIXME not sure what this is for
  conflictedTypesFields: string[]; // FIXME not sure what this is for
  cancellationToken: CancellationToken;
  settings: {
    separator: string;
    quoteValues: boolean;
    timezone: string | null;
    maxSizeBytes: number;
    scroll: { duration: string; size: number };
  };
}

/*
 * These filter types are stub types to help ensure things get passed to
 * non-Typescript functions in the right order. An actual structure is not
 * needed because the code doesn't look into the properties; just combines them
 * and passes them through to other non-TS modules.
 */
export interface Filter {
  isFilter: boolean;
}
export interface TimeFilter extends Filter {
  isTimeFilter: boolean;
}
export interface QueryFilter extends Filter {
  isQueryFilter: boolean;
}
export interface SearchSourceFilter extends Filter {
  isSearchSourceFilter: boolean;
}

export interface ESQueryConfig {
  allowLeadingWildcards: boolean;
  queryStringOptions: boolean;
  ignoreFilterIfFieldNotInIndex: boolean;
}

export interface IndexPatternField {
  scripted: boolean;
  lang?: string;
  script?: string;
  name: string;
}
