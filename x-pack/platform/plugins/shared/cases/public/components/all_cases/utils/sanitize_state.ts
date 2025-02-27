/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { CaseSeverity } from '../../../../common';
import { SORT_ORDER_VALUES } from '../../../../common/ui';
import { DEFAULT_QUERY_PARAMS } from '../../../containers/constants';
import type { AllCasesTableState } from '../types';
import { CASES_TABLE_PER_PAGE_VALUES } from '../types';

interface PartialState {
  queryParams?: Partial<AllCasesTableState['queryParams']>;
  filterOptions?: Partial<AllCasesTableState['filterOptions']>;
}

interface PartialParams {
  queryParams: Partial<AllCasesTableState['queryParams']>;
  filterOptions: Partial<AllCasesTableState['filterOptions']>;
}

export const sanitizeState = (state: PartialState = {}): PartialParams => {
  return {
    queryParams: sanitizeQueryParams(state.queryParams) ?? {},
    filterOptions: sanitizeFilterOptions(state.filterOptions) ?? {},
  };
};

const sanitizeQueryParams = (
  queryParams: PartialState['queryParams'] = {}
): PartialState['queryParams'] => {
  const { perPage, sortOrder, ...restQueryParams } = queryParams;

  const queryParamsSanitized: PartialState['queryParams'] = {
    ...restQueryParams,
  };

  if (perPage) {
    queryParamsSanitized.perPage = Math.min(
      perPage,
      CASES_TABLE_PER_PAGE_VALUES[CASES_TABLE_PER_PAGE_VALUES.length - 1]
    );
  }

  if (sortOrder) {
    queryParamsSanitized.sortOrder = SORT_ORDER_VALUES.includes(sortOrder)
      ? sortOrder
      : DEFAULT_QUERY_PARAMS.sortOrder;
  }

  return queryParamsSanitized;
};

const sanitizeFilterOptions = (
  filterOptions: PartialState['filterOptions'] = {}
): PartialState['filterOptions'] => {
  const { status, severity, ...restFilterOptions } = filterOptions;

  const filterOptionsSanitized: PartialState['filterOptions'] = {
    ...restFilterOptions,
  };

  if (status) {
    filterOptionsSanitized.status = filterOutOptions(status, CaseStatuses);
  }

  if (severity) {
    filterOptionsSanitized.severity = filterOutOptions(severity, CaseSeverity);
  }

  return filterOptionsSanitized;
};

const filterOutOptions = <T extends string>(collection: T[], validValues: Record<string, T>): T[] =>
  collection.filter((value) => Object.values(validValues).includes(value));
