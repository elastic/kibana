/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { InMemoryPackagePolicy } from '../../../../../../types';
import { sendBulkUpgradeAgentlessPolicies, useStartServices } from '../../../../../../hooks';
import { ExperimentalFeaturesService } from '../../../../../../services';

/**
 * Shared per-row agentless upgrade action for the deployments-table upgrade controls
 * (the inline `PackagePolicyUpgradeCell` button and the `PackagePolicyActionsMenu` item).
 *
 * Once `disableAgentlessLegacyAPI` is on, the legacy `upgrade_package_policy` edit route those
 * controls link to is blocked for agentless policies (the edit-page dry-run 400s and the flow
 * no-ops). When `isAgentlessUpgrade` is true, callers should render an action that calls
 * `openModal` instead of linking to that route; the returned `confirmModal` performs the upgrade
 * through the agentless API and calls `onUpgraded` so the caller can refetch. While the flag is
 * off the legacy edit-page upgrade still works, so `isAgentlessUpgrade` is false and callers keep
 * their existing link.
 */
export const useAgentlessPolicyUpgrade = ({
  packagePolicy,
  onUpgraded,
}: {
  packagePolicy: Pick<InMemoryPackagePolicy, 'id' | 'name' | 'supports_agentless'>;
  onUpgraded?: () => void;
}): {
  isAgentlessUpgrade: boolean;
  openModal: () => void;
  confirmModal: React.ReactNode;
} => {
  const { notifications } = useStartServices();
  const isAgentlessUpgrade =
    Boolean(packagePolicy.supports_agentless) &&
    ExperimentalFeaturesService.get().disableAgentlessLegacyAPI;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const openModal = useCallback(() => setIsModalVisible(true), []);

  const handleConfirm = useCallback(async () => {
    setIsUpgrading(true);
    try {
      const results = await sendBulkUpgradeAgentlessPolicies([packagePolicy.id]);
      const failed = results.filter((result) => !result.success);
      if (failed.length > 0) {
        const errorMessage = failed.find((result) => result.body?.message)?.body?.message;
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.fleet.agentlessUpgrade.errorToast.title', {
            defaultMessage: 'Error upgrading managed integration',
          }),
          text: errorMessage
            ? i18n.translate('xpack.fleet.agentlessUpgrade.errorToast.messageWithError', {
                defaultMessage: 'Upgrade it manually.\nError: {error}',
                values: { error: errorMessage },
              })
            : i18n.translate('xpack.fleet.agentlessUpgrade.errorToast.message', {
                defaultMessage: 'Upgrade it manually.',
              }),
        });
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.agentlessUpgrade.successToast.title', {
            defaultMessage: 'Upgraded {name}',
            values: { name: packagePolicy.name },
          })
        );
        // Only refetch on success; on failure nothing changed server-side.
        onUpgraded?.();
      }
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.agentlessUpgrade.errorToast.title', {
          defaultMessage: 'Error upgrading managed integration',
        }),
      });
    } finally {
      setIsUpgrading(false);
      setIsModalVisible(false);
    }
  }, [notifications.toasts, onUpgraded, packagePolicy.id, packagePolicy.name]);

  const confirmModal = isModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.title', {
        defaultMessage: 'Upgrade {name}?',
        values: { name: packagePolicy.name },
      })}
      onCancel={() => setIsModalVisible(false)}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.confirm', {
        defaultMessage: 'Upgrade integration policy',
      })}
      isLoading={isUpgrading}
      buttonColor="primary"
    >
      <FormattedMessage
        id="xpack.fleet.agentlessUpgrade.confirmModal.body"
        defaultMessage="This upgrades the integration policy to the latest package version and deploys the change to the managed integration."
      />
    </EuiConfirmModal>
  ) : null;

  return { isAgentlessUpgrade, openModal, confirmModal };
};
