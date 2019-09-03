/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { FilterQuery, SerializedFilterQuery } from './reducer';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_filter');

export const setWaffleFilterQueryDraft = actionCreator<FilterQuery>(
  'SET_WAFFLE_FILTER_QUERY_DRAFT'
);

export const applyWaffleFilterQuery = actionCreator<SerializedFilterQuery>(
  'APPLY_WAFFLE_FILTER_QUERY'
);
