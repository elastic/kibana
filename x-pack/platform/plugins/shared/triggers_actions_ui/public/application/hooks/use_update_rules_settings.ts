/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { RulesSettingsProperties } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { updateFlappingSettings } from '../lib/rule_api/update_flapping_settings';
import { updateQueryDelaySettings } from '../lib/rule_api/update_query_delay_settings';

interface UseUpdateRuleSettingsProps {
  onClose: () => void;
  onSave?: () => void;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
}

export const useUpdateRuleSettings = (props: UseUpdateRuleSettingsProps) => {
  const { onSave, onClose, setUpdatingRulesSettings } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = async (settings: RulesSettingsProperties) => {
    const updates = [];
    if (settings.flapping) {
      updates.push(updateFlappingSettings({ http, flappingSettings: settings.flapping }));
    }

    if (settings.queryDelay) {
      updates.push(updateQueryDelaySettings({ http, queryDelaySettings: settings.queryDelay }));
    }

    return await Promise.all(updates);
  };

  return useMutation({
    mutationFn,
    onMutate: () => {
      onClose();
      setUpdatingRulesSettings?.(true);
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsSuccess', {
          defaultMessage: 'Rules settings updated successfully.',
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsFailure', {
          defaultMessage: 'Failed to update rules settings.',
        })
      );
    },
    onSettled: () => {
      setUpdatingRulesSettings?.(false);
      onSave?.();
    },
  });
};
