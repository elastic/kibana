/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { isRight } from 'fp-ts/lib/Either';
import { GetOverviewFiltersPayload } from '../actions/overview_filters';
import { getApiPath, parameterizeValues } from '../../lib/helper';
import { OverviewFiltersType } from '../../../common/runtime_types';

type ApiRequest = GetOverviewFiltersPayload & {
  basePath: string;
};

export const fetchOverviewFilters = async ({
  basePath,
  dateRangeStart,
  dateRangeEnd,
  search,
  schemes,
  locations,
  ports,
  tags,
}: ApiRequest) => {
  const url = getApiPath(`/api/uptime/filters`, basePath);

  const params = new URLSearchParams({
    dateRangeStart,
    dateRangeEnd,
  });

  if (search) {
    params.append('search', search);
  }

  parameterizeValues(params, { schemes, locations, ports, tags });

  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const decoded = OverviewFiltersType.decode(responseData);

  ThrowReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`getOverviewFilters` response did not correspond to expected type');
};
