/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { isRight } from 'fp-ts/lib/Either';
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
  const params = {
    dateRangeStart,
    dateRangeEnd,
    ...(filters && { filters }),
    ...(statusFilter && { statusFilter }),
  };
  const urlParams = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const decoded = SnapshotType.decode(responseData);
  ThrowReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`getSnapshotCount` response did not correspond to expected type');
};
