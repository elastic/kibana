/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RuleDoctorApi } from '../services/rule_doctor_api';
import { ruleDoctorExecutionKeys } from './query_key_factory';

export const useRunAnalysis = () => {
  const ruleDoctorApi = useService(RuleDoctorApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ruleDoctorApi.runAnalysis(),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.ruleDoctor.executions.runScheduledToast', {
          defaultMessage: 'Analysis scheduled. It will appear below shortly.',
        })
      );
      queryClient.invalidateQueries(ruleDoctorExecutionKeys.lists());
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.ruleDoctor.executions.runErrorToast', {
          defaultMessage: 'Failed to schedule analysis',
        })
      );
    },
  });
};
