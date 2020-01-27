/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode } from 'react';

import {
  IIndexPattern,
  esFilters,
  FilterManager,
  Query,
} from '../../../../../../../../../../src/plugins/data/public';
import { IMitreEnterpriseAttack } from '../../types';

export interface ListItems {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface BuildQueryBarDescription {
  field: string;
  filters: esFilters.Filter[];
  filterManager: FilterManager;
  query: Query;
  savedId: string;
  indexPatterns?: IIndexPattern;
}

export interface BuildThreatDescription {
  label: string;
  threat: IMitreEnterpriseAttack[];
}
