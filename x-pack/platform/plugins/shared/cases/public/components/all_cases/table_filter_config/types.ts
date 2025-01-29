/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions } from '../../../../common/ui';

export interface FilterConfigState {
  key: string;
  isActive: boolean;
}

export type FilterChangeHandler = (params: Partial<FilterOptions>) => void;

export interface FilterConfigRenderParams {
  filterOptions: FilterOptions;
}

export interface FilterConfig {
  key: string;
  label: string;
  isActive: boolean;
  isAvailable: boolean;
  getEmptyOptions: () => Partial<FilterOptions>;
  render: (params: FilterConfigRenderParams) => React.ReactNode;
}
