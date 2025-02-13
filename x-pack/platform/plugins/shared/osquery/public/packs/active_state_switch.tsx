/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../common/lib/kibana';
import { useAgentPolicies } from '../agent_policies/use_agent_policies';
import { ConfirmDeployAgentPolicyModal } from './form/confirmation_modal';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useUpdatePack } from './use_update_pack';
import { PACKS_ID } from './constants';
import type { PackSavedObject } from './types';

const euiLoadingSpinnerCss = ({ euiTheme }: UseEuiTheme) => ({
  marginRight: euiTheme.size.s,
});

interface ActiveStateSwitchProps {
  disabled?: boolean;
  item: PackSavedObject & { policy_ids: string[] };
}

const ActiveStateSwitchComponent: React.FC<ActiveStateSwitchProps> = ({ item }) => {
  const queryClient = useQueryClient();
  const {
    application: {
      capabilities: { osquery: permissions },
    },
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [confirmationModal, setConfirmationModal] = useState(false);

  const hideConfirmationModal = useCallback(() => setConfirmationModal(false), []);

  const { data } = useAgentPolicies();

  const agentCount = useMemo(
    () =>
      item.policy_ids.reduce(
        (acc, policyId) => acc + (data?.agentPoliciesById[policyId]?.agents || 0),
        0
      ),
    [data?.agentPoliciesById, item.policy_ids]
  );

  const { isLoading, mutateAsync } = useUpdatePack({
    options: {
      onSuccess: (response) => {
        queryClient.invalidateQueries([PACKS_ID]);
        setErrorToast();
        toasts.addSuccess(
          response?.data?.enabled
            ? i18n.translate('xpack.osquery.pack.table.activatedSuccessToastMessageText', {
                defaultMessage: 'Successfully activated "{packName}" pack',
                values: {
                  packName: response?.data?.name,
                },
              })
            : i18n.translate('xpack.osquery.pack.table.deactivatedSuccessToastMessageText', {
                defaultMessage: 'Successfully deactivated "{packName}" pack',
                values: {
                  packName: response?.data?.name,
                },
              })
        );
      },
    },
  });

  const handleToggleActive = useCallback(() => {
    mutateAsync({ id: item.saved_object_id, enabled: !item.enabled });
    hideConfirmationModal();
  }, [hideConfirmationModal, item, mutateAsync]);

  const handleToggleActiveClick = useCallback(() => {
    if (agentCount) {
      return setConfirmationModal(true);
    }

    handleToggleActive();
  }, [agentCount, handleToggleActive]);

  return (
    <>
      {isLoading && <EuiLoadingSpinner css={euiLoadingSpinnerCss} />}
      <EuiSwitch
        checked={!!item.enabled}
        disabled={!permissions.writePacks || isLoading}
        showLabel={false}
        aria-label={item.name}
        label=""
        onChange={handleToggleActiveClick}
      />
      {confirmationModal && agentCount && (
        <ConfirmDeployAgentPolicyModal
          onConfirm={handleToggleActive}
          onCancel={hideConfirmationModal}
          agentCount={agentCount}
          agentPolicyCount={item.policy_ids.length}
        />
      )}
    </>
  );
};

export const ActiveStateSwitch = React.memo(ActiveStateSwitchComponent);
