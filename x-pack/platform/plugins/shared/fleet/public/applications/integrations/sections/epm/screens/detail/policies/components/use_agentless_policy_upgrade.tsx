/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCheckbox, EuiConfirmModal, EuiLink, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

import type { InMemoryPackagePolicy } from '../../../../../../types';
import { sendBulkUpgradeAgentlessPolicies, useStartServices } from '../../../../../../hooks';
import { ExperimentalFeaturesService } from '../../../../../../services';
import { useChangelog } from '../../hooks';
import type { BreakingChangesLog } from '../../utils';

type UpgradablePackagePolicy = Pick<
  InMemoryPackagePolicy,
  'id' | 'name' | 'supports_agentless' | 'package' | 'upgradeVersion'
>;

interface ConfirmModalProps {
  packagePolicy: UpgradablePackagePolicy;
  isUpgrading: boolean;
  onCancel: () => void;
  onConfirm: (acknowledgeBreakingChanges: boolean) => void;
}

const AgentlessUpgradeConfirmModal: React.FC<
  ConfirmModalProps & { breakingChanges: BreakingChangesLog | null; isLoading: boolean }
> = ({ packagePolicy, isUpgrading, onCancel, onConfirm, breakingChanges, isLoading }) => {
  const modalTitleId = useGeneratedHtmlId();
  const checkboxId = useGeneratedHtmlId({ prefix: 'agentlessUpgradeBreakingChangesCheckbox' });
  const [isBreakingChangesUnderstood, setIsBreakingChangesUnderstood] = useState(false);
  const hasBreakingChanges = Boolean(breakingChanges?.length);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.title', {
        defaultMessage: 'Upgrade {name}?',
        values: { name: packagePolicy.name },
      })}
      onCancel={onCancel}
      onConfirm={() => onConfirm(hasBreakingChanges && isBreakingChangesUnderstood)}
      cancelButtonText={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.fleet.agentlessUpgrade.confirmModal.confirm', {
        defaultMessage: 'Upgrade integration policy',
      })}
      confirmButtonDisabled={isLoading || (hasBreakingChanges && !isBreakingChangesUnderstood)}
      isLoading={isUpgrading}
      buttonColor="primary"
    >
      <FormattedMessage
        id="xpack.fleet.agentlessUpgrade.confirmModal.body"
        defaultMessage="This upgrades the integration policy to the latest package version and deploys the change to the managed integration."
      />
      {hasBreakingChanges && (
        <>
          <EuiSpacer size="m" />
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.translate(
              'xpack.fleet.agentlessUpgrade.confirmModal.breakingChangesTitle',
              {
                defaultMessage: 'This upgrade includes breaking changes',
              }
            )}
            data-test-subj="agentlessUpgradeBreakingChangesCallout"
          >
            <ul>
              {breakingChanges!.flatMap(({ version, changes }) =>
                changes.map(({ description, link }) => (
                  <li key={`${version}-${link}-${description}`}>
                    {`${version}: ${description} `}
                    <EuiLink href={link} target="_blank" external>
                      <FormattedMessage
                        id="xpack.fleet.agentlessUpgrade.confirmModal.breakingChangeLink"
                        defaultMessage="Details"
                      />
                    </EuiLink>
                  </li>
                ))
              )}
            </ul>
            <EuiSpacer size="s" />
            <EuiCheckbox
              id={checkboxId}
              data-test-subj="agentlessUpgradeBreakingChangesCheckbox"
              label={i18n.translate(
                'xpack.fleet.agentlessUpgrade.confirmModal.breakingChangesCheckbox',
                { defaultMessage: "I've reviewed the breaking changes and want to upgrade" }
              )}
              checked={isBreakingChangesUnderstood}
              onChange={() => setIsBreakingChangesUnderstood((prev) => !prev)}
            />
          </KbnWarningCallout>
        </>
      )}
    </EuiConfirmModal>
  );
};

// Only mounted while the modal is open, so the changelog is not fetched for every table row.
const AgentlessUpgradeConfirmModalWithChangelog: React.FC<
  ConfirmModalProps & { pkgName: string; fromVersion: string; toVersion: string }
> = ({ pkgName, fromVersion, toVersion, ...props }) => {
  const { breakingChanges, isLoading } = useChangelog(pkgName, toVersion, fromVersion);
  return (
    <AgentlessUpgradeConfirmModal
      {...props}
      breakingChanges={breakingChanges}
      isLoading={isLoading}
    />
  );
};

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
  packagePolicy: UpgradablePackagePolicy;
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

  const openModal = useCallback(() => setIsModalVisible(true), []);

  const handleConfirm = useCallback(
    async (acknowledgeBreakingChanges: boolean) => {
      setIsUpgrading(true);
      try {
        const results = await sendBulkUpgradeAgentlessPolicies([packagePolicy.id], {
          acknowledgeBreakingChanges,
        });
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
    },
    [notifications.toasts, onUpgraded, packagePolicy.id, packagePolicy.name]
  );

  const pkgName = packagePolicy.package?.name;
  const fromVersion = packagePolicy.package?.version;
  const toVersion = packagePolicy.upgradeVersion;
  const confirmModalProps: ConfirmModalProps = {
    packagePolicy,
    isUpgrading,
    onCancel: () => setIsModalVisible(false),
    onConfirm: handleConfirm,
  };

  const confirmModal = !isModalVisible ? null : pkgName && fromVersion && toVersion ? (
    <AgentlessUpgradeConfirmModalWithChangelog
      {...confirmModalProps}
      pkgName={pkgName}
      fromVersion={fromVersion}
      toVersion={toVersion}
    />
  ) : (
    <AgentlessUpgradeConfirmModal {...confirmModalProps} breakingChanges={null} isLoading={false} />
  );

  return { isAgentlessUpgrade, openModal, confirmModal };
};
