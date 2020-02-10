/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { CancellationToken } from '../../common/cancellation_token';
import { JobDocPayload, JobParamPostPayload, ConditionalHeaders } from '../../types';

export interface JobParamPostPayloadDiscoverCsv extends JobParamPostPayload {
  state?: {
    query: any;
    sort: any[];
  };
}

export interface JobParamsDiscoverCsv {
  indexPatternId?: string;
  post?: JobParamPostPayloadDiscoverCsv; // delete this
}

export interface JobDocPayloadDiscoverCsv extends JobDocPayload {
  searchRequest: any;
  fields: any;
  indexPatternSavedObject: any;
  metaFields: any;
  conflictedTypesFields: any;
}

export type ESQueueCreateJobFnDiscoverCsv = (
  jobParams: JobParamsDiscoverCsv,
  headers: ConditionalHeaders,
  request: Request
) => Promise<JobParamsDiscoverCsv>;

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

export interface SearchRequest {
  index: string;
  body:
    | {
        _source: {
          excludes: string[];
          includes: string[];
        };
        docvalue_fields: string[];
        query:
          | {
              bool: {
                filter: any[];
                must_not: any[];
                should: any[];
                must: any[];
              };
            }
          | any;
        script_fields: any;
        sort: Array<{
          [key: string]: {
            order: string;
          };
        }>;
        stored_fields: string[];
      }
    | any;
}

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

export interface SavedSearchGeneratorResult {
  content: string;
  csvContainsFormulas: boolean;
  maxSizeReached: boolean;
  size: number;
}

export interface CsvResultFromSearch {
  type: string;
  result: SavedSearchGeneratorResult;
}
