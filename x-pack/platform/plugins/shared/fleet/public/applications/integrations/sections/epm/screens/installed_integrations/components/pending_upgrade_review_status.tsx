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
  EuiIconTip,
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

export const PendingUpgradeReviewStatus: React.FunctionComponent<UpgradeReviewProps> = React.memo(
  ({ pkgName, pendingUpgradeReview, pkgTitle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                  defaultMessage="Policy upgrade accepted"
                />
              ) as unknown as string,
            });
          },
        }
      );
    }, [reviewUpgradeMutation, pkgName, targetVersion, notifications.toasts, closeModal]);

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
                  defaultMessage="Policy upgrade dismissed"
                />
              ) as unknown as string,
              text: (
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.upgradeReviewDismissedText"
                  defaultMessage="Auto-upgrade is paused for version {version}"
                  values={{ version: targetVersion }}
                />
              ) as unknown as string,
            });
          },
        }
      );
    }, [reviewUpgradeMutation, pkgName, targetVersion, notifications.toasts, closeModal]);

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
                  defaultMessage="Attached policies will be upgraded to {title} {version}"
                  values={{ title: pkgTitle, version: targetVersion }}
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewDescription"
                  defaultMessage="This version introduces deprecations that may affect your current setup. Please {settingsLink} before upgrading."
                  values={{
                    settingsLink: (
                      <EuiLink href={settingsHref}>
                        <FormattedMessage
                          id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewSettingsLink"
                          defaultMessage="review the changes"
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
                  id="xpack.fleet.epmInstalledIntegrations.dismissUpgradeButton"
                  defaultMessage="Dismiss"
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
          <EuiIconTip
            type="warning"
            color="warning"
            position="top"
            content={i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.statusUpgradePausedTooltip',
              {
                defaultMessage: 'Upgrade to version {version} paused.',
                values: { version: pendingUpgradeReview.target_version },
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="warning"
            iconType="play"
            fill={true}
            onClick={handleReEnable}
            isLoading={reviewUpgradeMutation.isLoading}
          >
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.reEnableUpgradeButton"
              defaultMessage="Re-enable"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
