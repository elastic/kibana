/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../common/lib/kibana';
import { useAgentPolicies } from '../agent_policies/use_agent_policies';
import { expandToSharedIntegrations } from '../agent_policies/expand_to_shared_integrations';
import { ConfirmDeployAgentPolicyModal } from './form/confirmation_modal';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useUpdatePack } from './use_update_pack';
import { PACKS_ID } from './constants';
import type { PackSavedObject } from './types';
import { addSharedIntegrationWarningToasts } from './shared_integration_warning_toast';

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
      getUrlForApp,
      navigateToApp,
    },
    notifications: { toasts },
    analytics,
    i18n: i18nStart,
    theme,
  } = useKibana().services;
  const startServices = useMemo(
    () => ({ analytics, i18n: i18nStart, theme }),
    [analytics, i18nStart, theme]
  );
  const setErrorToast = useErrorToast();
  const [confirmationModal, setConfirmationModal] = useState(false);

  const hideConfirmationModal = useCallback(() => setConfirmationModal(false), []);

  const { data, isFetched: agentPoliciesFetched, isError: agentPoliciesError } = useAgentPolicies();
  // The shared-integration groups come from this query; until it answers, the delivered
  // set (and with it the need for a confirmation) is unknown.
  const agentPoliciesLoading = !agentPoliciesFetched && !agentPoliciesError;

  // Fleet delivers a pack to every agent policy of a shared integration, so
  // expand the saved targets by their group. `effective_policy_ids` alone is
  // not enough: a disabled pack has no wire block and reports `[]`.
  const deliveredPolicyIds = useMemo(() => {
    const ids = expandToSharedIntegrations(item.policy_ids, data?.groupsByPackagePolicyId);
    (item.effective_policy_ids ?? []).forEach((id) => ids.add(id));

    return [...ids];
  }, [data?.groupsByPackagePolicyId, item.effective_policy_ids, item.policy_ids]);

  const agentCount = useMemo(
    () =>
      deliveredPolicyIds.reduce(
        (acc, policyId) => acc + (data?.agentPoliciesById[policyId]?.agents || 0),
        0
      ),
    [data?.agentPoliciesById, deliveredPolicyIds]
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
        addSharedIntegrationWarningToasts({
          warnings: response?.warnings,
          packId: item.saved_object_id,
          toasts,
          queryClient,
          getUrlForApp,
          navigateToApp,
          startServices,
        });
      },
    },
  });

  const handleToggleActive = useCallback(() => {
    mutateAsync({ id: item.saved_object_id, enabled: !item.enabled });
    hideConfirmationModal();
  }, [hideConfirmationModal, item, mutateAsync]);

  const handleToggleActiveClick = useCallback(() => {
    // If the agent policies could not be loaded, ask anyway: the pack may reach agents
    // through a shared integration we cannot see.
    if (agentCount || (agentPoliciesError && item.policy_ids.length > 0)) {
      return setConfirmationModal(true);
    }

    handleToggleActive();
  }, [agentCount, agentPoliciesError, handleToggleActive, item.policy_ids.length]);

  const hasNoPolicies = item.policy_ids.length === 0;
  const zeroPolicyGuardActive = hasNoPolicies && !item.enabled;

  const euiSwitch = (
    <EuiSwitch
      checked={!!item.enabled}
      disabled={
        !permissions.writePacks || isLoading || agentPoliciesLoading || zeroPolicyGuardActive
      }
      showLabel={false}
      aria-label={item.name}
      label=""
      onChange={handleToggleActiveClick}
    />
  );

  return (
    <>
      {isLoading && <EuiLoadingSpinner css={euiLoadingSpinnerCss} />}
      {zeroPolicyGuardActive ? (
        <EuiToolTip
          content={i18n.translate('xpack.osquery.pack.table.enableZeroPolicyTooltip', {
            defaultMessage: 'Please assign at least one policy to enable this schedule.',
          })}
        >
          <span tabIndex={0}>{euiSwitch}</span>
        </EuiToolTip>
      ) : (
        euiSwitch
      )}
      {confirmationModal && (agentCount > 0 || agentPoliciesError) && (
        <ConfirmDeployAgentPolicyModal
          onConfirm={handleToggleActive}
          onCancel={hideConfirmationModal}
          agentCount={agentPoliciesError ? undefined : agentCount}
          agentPolicyCount={deliveredPolicyIds.length}
        />
      )}
    </>
  );
};

export const ActiveStateSwitch = React.memo(ActiveStateSwitchComponent);
