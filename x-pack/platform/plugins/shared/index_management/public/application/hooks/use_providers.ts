/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { getInferenceServices } from '../services';
import { useMLModelNotificationToasts } from '../../hooks/use_ml_model_status_toasts';

export const useProviders = () => {
  const { showProviderFetchErrorToasts } = useMLModelNotificationToasts();

  const fetchInferenceServices = useCallback(async () => {
    try {
      const { data: serviceProviders } = await getInferenceServices();
      return serviceProviders;
    } catch (error) {
      showProviderFetchErrorToasts(error?.message);
    }
  }, [showProviderFetchErrorToasts]);

  return {
    fetchInferenceServices,
  };
};
