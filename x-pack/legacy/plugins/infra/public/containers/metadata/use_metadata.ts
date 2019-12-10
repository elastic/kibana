/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { InfraNodeType } from '../../graphql/types';
import { InfraMetadata, InfraMetadataRT } from '../../../common/http_api/metadata_api';
import { useHTTPRequest } from '../../hooks/use_http_request';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { InventoryMetric } from '../../../common/inventory_models/types';
import { getFilteredMetrics } from './lib/get_filtered_metrics';

export function useMetadata(
  nodeId: string,
  nodeType: InfraNodeType,
  requiredMetrics: InventoryMetric[],
  sourceId: string
) {
  const decodeResponse = (response: any) => {
    return pipe(InfraMetadataRT.decode(response), fold(throwErrors(createPlainError), identity));
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InfraMetadata>(
    '/api/infra/metadata',
    'POST',
    JSON.stringify({
      nodeId,
      nodeType,
      sourceId,
      decodeResponse,
    })
  );

  useEffect(() => {
    (async () => {
      await makeRequest();
    })();
  }, [makeRequest]);

  return {
    name: (response && response.name) || '',
    filteredRequiredMetrics:
      (response && getFilteredMetrics(requiredMetrics, response.features)) || [],
    error: (error && error.message) || null,
    loading,
    metadata: response,
    cloudId:
      (response &&
        response.info &&
        response.info.cloud &&
        response.info.cloud.instance &&
        response.info.cloud.instance.id) ||
      '',
  };
}
