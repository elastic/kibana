/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButton,
  EuiLink,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  useGeneratedHtmlId,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import { useLink, useReviewUpgradeMutation, useStartServices } from '../../../../../../../hooks';
import type { Installation } from '../../../../../../../../common/types';

export interface UpgradeReviewProps {
  pkgName: string;
  pkgTitle: string;
  pendingUpgradeReview: NonNullable<Installation['pending_upgrade_review']>;
}

const autoOpenModalForPackages = new Set<string>();

export const PendingUpgradeReviewStatus: React.FunctionComponent<UpgradeReviewProps> = React.memo(
  ({ pkgName, pendingUpgradeReview, pkgTitle }) => {
    const [isModalOpen, setIsModalOpen] = useState(() => {
      if (autoOpenModalForPackages.has(pkgName)) {
        autoOpenModalForPackages.delete(pkgName);
        return true;
      }
      return false;
    });
    const reviewUpgradeMutation = useReviewUpgradeMutation();
    const { notifications } = useStartServices();
    const { getHref } = useLink();

    const targetVersion = pendingUpgradeReview.target_version;
    const settingsHref = getHref('integration_details_settings', {
      pkgkey: `${pkgName}-${targetVersion}`,
    });

    const modalTitleId = useGeneratedHtmlId();
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const handleAccept = useCallback(() => {
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'accept', targetVersion },
        {
          onSuccess: () => {
            closeModal();
            notifications.toasts.addSuccess({
              title: (
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.upgradeReviewAcceptedTitle"
                  defaultMessage="Auto-upgrade accepted for {title} {version}"
                  values={{ title: pkgTitle, version: targetVersion }}
                />
              ) as unknown as string,
            });
          },
        }
      );
    }, [reviewUpgradeMutation, pkgName, pkgTitle, targetVersion, notifications.toasts, closeModal]);

    const handleDismiss = useCallback(() => {
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'decline', targetVersion },
        {
          onSuccess: () => {
            closeModal();
            notifications.toasts.addInfo({
              title: (
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.upgradeReviewDismissedTitle"
                  defaultMessage="Auto-upgrade paused for {title} {version}"
                  values={{ title: pkgTitle, version: targetVersion }}
                />
              ) as unknown as string,
            });
          },
        }
      );
    }, [reviewUpgradeMutation, pkgName, pkgTitle, targetVersion, notifications.toasts, closeModal]);

    return (
      <>
        <EuiButton size="s" color="warning" onClick={() => setIsModalOpen(true)}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="warning" color="warning" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.statusPendingReviewLabel"
                defaultMessage="Review upgrade"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>

        {isModalOpen && (
          <EuiModal onClose={closeModal} aria-labelledby={modalTitleId}>
            <EuiModalHeader>
              <EuiModalHeaderTitle id={modalTitleId}>
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewTitle"
                  defaultMessage="Upgrade the attached policies to {title} {version}"
                  values={{ title: pkgTitle, version: targetVersion }}
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewDescription"
                  defaultMessage="This version introduces deprecations that might affect your current setup. {settingsLink} before upgrading."
                  values={{
                    settingsLink: (
                      <EuiLink href={settingsHref}>
                        <FormattedMessage
                          id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewSettingsLink"
                          defaultMessage="Review the changes"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={handleDismiss} isLoading={reviewUpgradeMutation.isLoading}>
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pauseUpgradeButton"
                  defaultMessage="Pause upgrade"
                />
              </EuiButtonEmpty>
              <EuiButton
                color="warning"
                fill={true}
                onClick={handleAccept}
                isLoading={reviewUpgradeMutation.isLoading}
              >
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.acceptUpgradeButton"
                  defaultMessage="Accept upgrade"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        )}
      </>
    );
  }
);

export const DeclinedUpgradeStatus: React.FunctionComponent<UpgradeReviewProps> = React.memo(
  ({ pkgName, pendingUpgradeReview }) => {
    const reviewUpgradeMutation = useReviewUpgradeMutation();
    const { notifications } = useStartServices();

    const targetVersion = pendingUpgradeReview.target_version;

    const handleReEnable = useCallback(() => {
      autoOpenModalForPackages.add(pkgName);
      reviewUpgradeMutation.mutate(
        { pkgName, action: 'pending', targetVersion },
        {
          onSuccess: () => {
            notifications.toasts.addSuccess({
              title: (
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.upgradeReviewReEnabledTitle"
                  defaultMessage="Upgrade review re-enabled"
                />
              ) as unknown as string,
            });
          },
        }
      );
    }, [reviewUpgradeMutation, pkgName, targetVersion, notifications.toasts]);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.statusUpgradePausedTooltip',
              {
                defaultMessage:
                  'Auto-upgrade to version {version} has been paused. Click to review the changes.',
                values: { version: pendingUpgradeReview.target_version },
              }
            )}
          >
            <EuiButton color="primary" onClick={handleReEnable} size="s">
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.reEnableUpgradeButton"
                defaultMessage="Resume upgrade"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
