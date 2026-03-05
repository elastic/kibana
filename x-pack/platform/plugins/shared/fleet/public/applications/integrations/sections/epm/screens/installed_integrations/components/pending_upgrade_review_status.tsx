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

import { useLink, useUpgradeReviewActions } from '../../../../../../../hooks';
import type { UpgradeReviewProps } from '../../../../../../../hooks';

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
    const { getHref } = useLink();

    const targetVersion = pendingUpgradeReview.target_version;
    const settingsHref = getHref('integration_details_settings', {
      pkgkey: `${pkgName}-${targetVersion}`,
    });

    const modalTitleId = useGeneratedHtmlId();
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const { handleAccept, handleDismiss, isLoading } = useUpgradeReviewActions({
      pkgName,
      pkgTitle,
      targetVersion,
    });

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
              <EuiButtonEmpty onClick={() => handleDismiss(closeModal)} isLoading={isLoading}>
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pauseUpgradeButton"
                  defaultMessage="Pause upgrade"
                />
              </EuiButtonEmpty>
              <EuiButton
                color="warning"
                fill={true}
                onClick={() => handleAccept(closeModal)}
                isLoading={isLoading}
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
  ({ pkgName, pkgTitle, pendingUpgradeReview }) => {
    const targetVersion = pendingUpgradeReview.target_version;

    const { handleReEnable, isLoading } = useUpgradeReviewActions({
      pkgName,
      pkgTitle,
      targetVersion,
    });

    const onReEnable = useCallback(() => {
      autoOpenModalForPackages.add(pkgName);
      handleReEnable();
    }, [pkgName, handleReEnable]);

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
            <EuiButton color="primary" onClick={onReEnable} size="s" isLoading={isLoading}>
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
