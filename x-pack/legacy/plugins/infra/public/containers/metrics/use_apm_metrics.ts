/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useEffect } from 'react';
import stringify from 'json-stable-stringify';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { useHTTPRequest } from '../../hooks/use_http_request';
import { InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
import { InfraApmMetricsRT } from '../../../common/http_api/apm_metrics_api';
import { throwErrors } from '../../../common/runtime_types';

export const useApmMetrics = (
  sourceId: string,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: InfraTimerangeInput
) => {
  const body = useMemo(
    () => ({
      sourceId,
      nodeId,
      nodeType,
      timeRange: { min: timeRange.from, max: timeRange.to },
    }),
    [sourceId, nodeId, nodeType, timeRange]
  );

  const decode = (subject: any) =>
    pipe(
      InfraApmMetricsRT.decode(subject),
      fold(throwErrors(message => new Error(`APM Metrics Request Failed: ${message}`)), identity)
    );

  const { response, loading, error, makeRequest } = useHTTPRequest(
    '/api/infra/apm_metrics',
    'POST',
    stringify(body),
    decode
  );

  useEffect(() => {
    (async () => {
      await makeRequest();
    })();
  }, [makeRequest]);

  return { metrics: response, loading, error: error || void 0, makeRequest };
};
