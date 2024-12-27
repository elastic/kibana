/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { useKibana } from '..';
import { getInferenceServices } from '../services';

export const useProviders = () => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;

  const fetchInferenceServices = useCallback(async () => {
    try {
      const { data: serviceProviders } = await getInferenceServices();
      return serviceProviders;
    } catch (error) {
      toasts?.addError(new Error(error.body.message), {
        title: i18n.translate(
          'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.createInferenceFlyout.unableToFindProvidersQueryMessage',
          {
            defaultMessage: 'Unable to find providers',
          }
        ),
        toastMessage: error.body.message,
      });
    }
  }, [toasts]);

  return {
    fetchInferenceServices,
  };
};
