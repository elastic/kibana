/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
// import { isRight } from 'fp-ts/lib/Either';
import { getApiPath } from '../../lib/helper';
// import { SnapshotType, Snapshot } from '../../../common/runtime_types';
import { QueryParams } from '../actions/types';
import { Ping } from '../../../common/graphql/types';

export interface APIParams {
  basePath: string;
  monitorId: string;
}

export const fetchMonitorStatus = async ({
  basePath,
  monitorId,
  dateStart,
  dateEnd,
  location,
}: QueryParams & APIParams): Promise<Ping> => {
  const url = getApiPath(`/api/uptime/monitor/status`, basePath);
  const params = {
    monitorId,
    dateStart,
    dateEnd,
    ...(location && { location }),
  };
  const urlParams = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  return responseData;
  // const decoded = SnapshotType.decode(responseData);
  // ThrowReporter.report(decoded);
  // if (isRight(decoded)) {
  //   return decoded.right;
  // }
  // throw new Error('`fetchMonitorStatus` response did not correspond to expected type');
};
