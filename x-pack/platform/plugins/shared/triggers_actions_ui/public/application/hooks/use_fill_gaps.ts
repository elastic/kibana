/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { fillGap } from '../lib/rule_api/fill_gap';

export const useFillGaps = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = async ({ ruleId, gapId }: { ruleId: string; gapId: string }) => {
    return await fillGap({ http, ruleId, gapId });
  };

  return useMutation({
    mutationFn,
    onMutate: () => {},
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.updateRulesSettingsSuccess', {
          defaultMessage: 'Successfully scheduled backfill run to fill gap.',
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.updateRulesSettingsFailure', {
          defaultMessage: 'Failed to schedule backfill run to fill gap.',
        })
      );
    },
    onSettled: () => {},
  });
};
