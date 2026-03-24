/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import type { IToasts } from '@kbn/core/public';
import type { InferenceProvider } from '../..';
import { INFERENCE_ENDPOINT_INTERNAL_API_VERSION } from '../..';
import * as i18n from '../translations';

export const getProviders = async (http: HttpSetup): Promise<InferenceProvider[]> => {
  return await http.get(`/internal/_inference/_services`, {
    version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
  });
};

export const useProviders = (http: HttpSetup, toasts: IToasts) => {
  const onErrorFn = (error: { body: KibanaServerError }) => {
    toasts?.addError(new Error(error.body.message), {
      title: i18n.GET_PROVIDERS_FAILED,
      toastMessage: error.body.message,
    });
  };

  const query = useQuery(['user-profile'], {
    queryFn: () => getProviders(http),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    onError: onErrorFn,
  });
  return query;
};
