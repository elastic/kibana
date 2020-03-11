/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { SnapshotType, Snapshot } from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants/rest_api';

interface ApiRequest {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

export const fetchSnapshotCount = async ({
  dateRangeStart,
  dateRangeEnd,
  filters,
  statusFilter,
}: ApiRequest): Promise<Snapshot> => {
  const queryParams = {
    dateRangeStart,
    dateRangeEnd,
    ...(filters && { filters }),
    ...(statusFilter && { statusFilter }),
  };

  const responseData = await apiService.get(API_URLS.SNAPSHOT_COUNT, queryParams);

  const decoded = SnapshotType.decode(responseData);
  PathReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`getSnapshotCount` response did not correspond to expected type');
};
