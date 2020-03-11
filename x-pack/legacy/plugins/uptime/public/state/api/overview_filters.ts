/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { GetOverviewFiltersPayload } from '../actions/overview_filters';
import { OverviewFiltersType } from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants/rest_api';

export const fetchOverviewFilters = async ({
  dateRangeStart,
  dateRangeEnd,
  search,
  schemes,
  locations,
  ports,
  tags,
}: GetOverviewFiltersPayload) => {
  const queryParams = {
    dateRangeStart,
    dateRangeEnd,
    schemes,
    locations,
    ports,
    tags,
    search,
  };

  const responseData = await apiService.get(API_URLS.FILTERS, queryParams);

  const decoded = OverviewFiltersType.decode(responseData);

  PathReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`getOverviewFilters` response did not correspond to expected type');
};
