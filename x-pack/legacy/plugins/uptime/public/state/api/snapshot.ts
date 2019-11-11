/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { getApiPath } from '../../lib/helper';
import { SnapshotType, Snapshot } from '../../../common/runtime_types';

interface ApiRequest {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

export const fetchSnapshotCount = async ({
  basePath,
  dateRangeStart,
  dateRangeEnd,
  filters,
  statusFilter,
}: ApiRequest): Promise<Snapshot> => {
  const url = getApiPath(`/api/uptime/snapshot/count`, basePath);
  const urlParams = `?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}${
    filters ? `&filters=${filters}` : ''
  }${statusFilter ? `&statusFilter=${statusFilter}` : ''}`;
  const response = await fetch(`${url}${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  ThrowReporter.report(SnapshotType.decode(responseData));
  return responseData;
};
