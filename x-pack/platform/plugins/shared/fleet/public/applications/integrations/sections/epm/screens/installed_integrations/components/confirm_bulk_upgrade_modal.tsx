/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useGetFileByPathQuery } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';

export const ViewChangelog: React.FunctionComponent<{
  pkgName: string;
  pkgVersion: string;
}> = ({ pkgName, pkgVersion }) => {
  const { data: changelogText, isLoading } = useGetFileByPathQuery(
    `/package/${pkgName}/${pkgVersion}/changelog.yml`
  );

  return (
    <EuiSkeletonText lines={5} size="s" isLoading={isLoading} contentAriaLabel="changelog text">
      <EuiCodeBlock overflowHeight={150}>{changelogText}</EuiCodeBlock>
    </EuiSkeletonText>
  );
};

export const ConfirmBulkUpgradeModal: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
  onClose: () => void;
  onConfirm: (params: { updatePolicies: boolean }) => void;
}> = ({ onClose, onConfirm, selectedItems }) => {
  const { euiTheme } = useEuiTheme();
  const [updatePolicies, setUpdatePolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSingleItem = selectedItems.length === 1;

  return (
    <EuiConfirmModal
      title={
        isSingleItem
          ? i18n.translate('xpack.fleet.installedIntegrations.bulkUpgradeModal.title', {
              defaultMessage: 'Upgrade {pkgName} and policies',
              values: {
                pkgName: selectedItems[0].title,
              },
            })
          : i18n.translate('xpack.fleet.installedIntegrations.bulkUpgradeModal.title', {
              defaultMessage:
                'Upgrade {countIntegrations} integrations and {countPolicies} policies',
              values: {
                countIntegrations: selectedItems.length,
                countPolicies: selectedItems.reduce(
                  (acc, item) => acc + (item.packagePoliciesInfo?.count ?? 0),
                  0
                ),
              },
            })
      }
      confirmButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUpgradeModal.confirmButton',
        { defaultMessage: 'Upgrade to latest version' }
      )}
      cancelButtonText={
        isSingleItem
          ? i18n.translate(
              'xpack.fleet.installedIntegrations.bulkUpgradeModal.cancelSingleItemButton',
              {
                defaultMessage: 'Cancel',
              }
            )
          : i18n.translate('xpack.fleet.installedIntegrations.bulkUpgradeModal.cancelButton', {
              defaultMessage: 'Review integration selection',
            })
      }
      onCancel={onClose}
      isLoading={isLoading}
      onConfirm={async () => {
        try {
          setIsLoading(true);
          await onConfirm({ updatePolicies });
          onClose();
        } catch (err) {
          setIsLoading(false);
        }
      }}
    >
      <EuiText>
        {isSingleItem ? (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkUpgradeModal.singleItemDescription"
            defaultMessage={
              'We will upgrade this integration and policies to the latest available version.'
            }
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkUpgradeModal.description"
            defaultMessage={
              'We will upgrade your integrations and policies to the latest available version.'
            }
          />
        )}
      </EuiText>
      <EuiSpacer size="l" />
      {isSingleItem ? (
        <>
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.fleet.installedIntegrations.bulkUpgradeModal.installedVersionText"
              defaultMessage={'Installed version: {installedVersion}'}
              values={{
                installedVersion: <b>{selectedItems[0].installationInfo!.version}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.fleet.installedIntegrations.bulkUpgradeModal.latestVersionText"
              defaultMessage={'Latest version available: {latestVersion}'}
              values={{
                latestVersion: <b>{selectedItems[0].version}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="viewChangelog"
            buttonContent={
              <EuiTextColor color={euiTheme.colors.link}>
                <FormattedMessage
                  id="xpack.fleet.installedIntegrations.bulkUpgradeModal.viewChangelogButton"
                  defaultMessage="View Changelog"
                />
              </EuiTextColor>
            }
          >
            <ViewChangelog pkgName={selectedItems[0].name} pkgVersion={selectedItems[0].version} />
          </EuiAccordion>
          <EuiSpacer size="l" />
        </>
      ) : null}
      <EuiPanel hasShadow={false} hasBorder={false} color="subdued">
        <EuiFormRow fullWidth>
          <EuiSwitch
            data-test-subj="upgradeIntegrationsPoliciesSwitch"
            checked={updatePolicies}
            onChange={(e) => {
              setUpdatePolicies(e.target.checked);
            }}
            label={
              <FormattedMessage
                id="xpack.fleet.installedIntegrations.bulkUpgradeModal.policiesSwitchLabel"
                defaultMessage="Upgrade integration policies"
              />
            }
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <EuiIcon type="info" size="m" />
          &nbsp;
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkUpgradeModal.policiesCallout"
            defaultMessage="When enabled, Fleet will attempt to upgrade and deploy integration policies automatically."
          />
        </EuiText>
      </EuiPanel>
    </EuiConfirmModal>
  );
};
