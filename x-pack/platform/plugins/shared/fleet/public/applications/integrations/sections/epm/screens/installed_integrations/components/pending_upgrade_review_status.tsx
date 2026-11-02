/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  useGeneratedHtmlId,
  EuiPanel,
  EuiSpacer,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import { useGetPackageInfoByKeyQuery, useUpgradeReviewActions } from '../../../../../../../hooks';
import type { UpgradeReviewProps } from '../../../../../../../hooks';
import { DeprecatedFeaturesList } from '../../detail/overview/deprecation_callout';

const autoOpenModalForPackages = new Set<string>();
const modalOpenListeners = new Map<string, () => void>();

export const scheduleAutoOpenModal = (pkgName: string) => {
  const listener = modalOpenListeners.get(pkgName);
  if (listener) {
    listener();
  } else {
    autoOpenModalForPackages.add(pkgName);
  }
};

export const PendingUpgradeReviewStatus: React.FunctionComponent<UpgradeReviewProps> = React.memo(
  ({ pkgName, pendingUpgradeReview, pkgTitle }) => {
    const [isModalOpen, setIsModalOpen] = useState(() => {
      if (autoOpenModalForPackages.has(pkgName)) {
        autoOpenModalForPackages.delete(pkgName);
        return true;
      }
      return false;
    });

    useEffect(() => {
      modalOpenListeners.set(pkgName, () => setIsModalOpen(true));
      return () => {
        modalOpenListeners.delete(pkgName);
      };
    }, [pkgName]);
    const { data: packageInfoData, isLoading: isPackageInfoLoading } = useGetPackageInfoByKeyQuery(
      pkgName,
      pendingUpgradeReview.target_version,
      {
        prerelease: true,
        full: true,
      }
    );
    const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);

    const targetVersion = pendingUpgradeReview.target_version;

    const modalTitleId = useGeneratedHtmlId();
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const { handleAccept, handleDeclined, isLoading } = useUpgradeReviewActions({
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
                  defaultMessage="This version introduces deprecations that might affect your current setup. Review the following changes before upgrading."
                />
              </EuiText>
              <EuiSpacer size="m" />
              {isPackageInfoLoading ? (
                <EuiSkeletonText lines={3} />
              ) : (
                <EuiPanel paddingSize="m" color="warning">
                  {packageInfo && <DeprecatedFeaturesList packageInfo={packageInfo} />}
                </EuiPanel>
              )}
              <EuiSpacer size="m" />
              <EuiText size="s">
                <EuiIcon
                  type="info"
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewAcceptDescriptionIconLabel',
                    { defaultMessage: 'Info' }
                  )}
                />
                &nbsp;
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewAcceptDescription"
                  defaultMessage="Fleet will attempt to upgrade and deploy your policies automatically."
                />
              </EuiText>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={() => handleDeclined(closeModal)} isLoading={isLoading}>
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.declineUpgradeButton"
                  defaultMessage="Decline"
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
