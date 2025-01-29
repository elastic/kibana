/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import {
  FindFieldsMetadataRequestQuery,
  FindFieldsMetadataResponsePayload,
} from '../../../common/latest';
import { FieldsMetadataServiceStart } from '../../services/fields_metadata';

interface UseFieldsMetadataFactoryDeps {
  fieldsMetadataService: FieldsMetadataServiceStart;
}

export type UseFieldsMetadataParams = FindFieldsMetadataRequestQuery;

export interface UseFieldsMetadataReturnType {
  fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: ReturnType<typeof useAsyncFn>[1];
}

export type UseFieldsMetadataHook = (
  params?: UseFieldsMetadataParams,
  deps?: Parameters<typeof useAsyncFn>[1]
) => UseFieldsMetadataReturnType;

export const createUseFieldsMetadataHook = ({
  fieldsMetadataService,
}: UseFieldsMetadataFactoryDeps): UseFieldsMetadataHook => {
  return (params = {}, deps) => {
    const [{ error, loading, value }, load] = useAsyncFn(async () => {
      const client = await fieldsMetadataService.getClient();
      return client.find(params);
    }, deps);

    useEffect(() => {
      load();
    }, [load]);

    return { fieldsMetadata: value?.fields, loading, error, reload: load };
  };
};
