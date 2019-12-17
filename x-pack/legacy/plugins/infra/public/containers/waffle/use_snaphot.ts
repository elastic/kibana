/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  InfraNodeType,
  InfraSnapshotMetricInput,
  InfraSnapshotGroupbyInput,
} from '../../graphql/types';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { useHTTPRequest } from '../../hooks/use_http_request';
import {
  SnapshotNodeResponseRT,
  SnapshotNodeResponse,
} from '../../../common/http_api/snapshot_api';

export function useSnapshot(
  filterQuery: string | null | undefined,
  metric: InfraSnapshotMetricInput,
  groupBy: InfraSnapshotGroupbyInput[],
  nodeType: InfraNodeType,
  sourceId: string,
  currentTime: number,
  accountId: string,
  region: string
) {
  const decodeResponse = (response: any) => {
    return pipe(
      SnapshotNodeResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const timerange = {
    interval: '1m',
    to: currentTime,
    from: currentTime - 360 * 1000,
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<SnapshotNodeResponse>(
    '/api/metrics/snapshot',
    'POST',
    JSON.stringify({
      metric,
      groupBy,
      nodeType,
      timerange,
      filterQuery,
      sourceId,
      accountId,
      region,
    }),
    decodeResponse
  );

  useEffect(() => {
    (async () => {
      await makeRequest();
    })();
  }, [makeRequest]);

  return {
    error: (error && error.message) || null,
    loading,
    nodes: response ? response.nodes : [],
    reload: makeRequest,
  };
}
