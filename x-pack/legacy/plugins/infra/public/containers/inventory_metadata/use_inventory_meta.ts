/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { useHTTPRequest } from '../../hooks/use_http_request';
import {
  InventoryMetaResponseRT,
  InventoryMetaResponse,
} from '../../../common/http_api/inventory_meta_api';
import { InfraNodeType } from '../../graphql/types';

export function useInventoryMeta(sourceId: string, nodeType: InfraNodeType) {
  const decodeResponse = (response: any) => {
    return pipe(
      InventoryMetaResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InventoryMetaResponse>(
    '/api/infra/inventory/meta',
    'POST',
    JSON.stringify({
      sourceId,
      nodeType,
    }),
    decodeResponse
  );

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    error,
    loading,
    accounts: response ? response.accounts : [],
    regions: response ? response.regions : [],
    makeRequest,
  };
}
