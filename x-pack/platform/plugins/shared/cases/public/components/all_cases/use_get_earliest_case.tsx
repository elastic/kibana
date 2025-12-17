/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetCases } from '../../containers/use_get_cases';
import type { FilterOptions } from '../../containers/types';
import { SortFieldCase } from '../../../common/ui/types';

/**
 * Returns the earliest case from the cases list for the given owner.
 */
export const useGetEarliestCase = (filterOptions: Partial<FilterOptions>) => {
  const { data, isLoading } = useGetCases({
    filterOptions: {
      owner: filterOptions.owner,
      from: undefined,
      to: undefined,
    },
    queryParams: {
      page: 1,
      perPage: 1,
      sortField: SortFieldCase.createdAt,
      sortOrder: 'asc',
    },
  });
  return { earliestCase: data?.cases?.[0], isLoading };
};
