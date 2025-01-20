/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';

import type { Inspect, Maybe } from '../../common';
import type { RequestOptionsPaginated } from '../..';
import type { Agent } from '../../../shared_imports';

export interface AgentsStrategyResponse extends IEsSearchResponse {
  edges: Agent[];
  inspect?: Maybe<Inspect>;
}

export type AgentsRequestOptions = RequestOptionsPaginated;
