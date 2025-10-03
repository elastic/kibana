/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { InstalledPackageUIPackageListItem } from '../types';
import { useInstalledIntegrationsActions } from '../hooks/use_installed_integrations_actions';

export const InstalledIntegrationsActionMenu: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
}> = ({ selectedItems }) => {
  const [isOpen, setIsOpen] = useState(false);

  const button = (
    <EuiButton
      iconType="arrowDown"
      disabled={selectedItems.length === 0}
      iconSide="right"
      onClick={() => setIsOpen((s) => !s)}
    >
      <FormattedMessage
        id="xpack.fleet.epmInstalledIntegrations.actionButton"
        defaultMessage="Actions"
      />
    </EuiButton>
  );

  const {
    actions: {
      bulkUpgradeIntegrationsWithConfirmModal,
      bulkUninstallIntegrationsWithConfirmModal,
      bulkRollbackIntegrationsWithConfirmModal,
    },
  } = useInstalledIntegrationsActions();

  const openUpgradeModal = useCallback(() => {
    setIsOpen(false);
    return bulkUpgradeIntegrationsWithConfirmModal(selectedItems);
  }, [selectedItems, bulkUpgradeIntegrationsWithConfirmModal]);

  const openUninstallModal = useCallback(async () => {
    setIsOpen(false);
    return bulkUninstallIntegrationsWithConfirmModal(selectedItems);
  }, [selectedItems, bulkUninstallIntegrationsWithConfirmModal]);

  const openRollbackModal = useCallback(async () => {
    setIsOpen(false);
    return bulkRollbackIntegrationsWithConfirmModal(selectedItems);
  }, [selectedItems, bulkRollbackIntegrationsWithConfirmModal]);

  const items = useMemo(() => {
    const hasUpgreadableIntegrations = selectedItems.some(
      (item) =>
        item.ui.installation_status === 'upgrade_available' ||
        item.ui.installation_status === 'upgrade_failed' ||
        item.ui.installation_status === 'install_failed'
    );

    const hasUninstallableIntegrations = selectedItems.some(
      (item) => (item.packagePoliciesInfo?.count ?? 0) > 0
    );

    const hasRollbackableIntegrations = selectedItems.some(
      (item) => !!item.installationInfo?.previous_version
    );

    return [
      <EuiContextMenuItem
        key="upgrade"
        icon="refresh"
        disabled={!hasUpgreadableIntegrations}
        onClick={openUpgradeModal}
      >
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.bulkUpgradeButton"
          defaultMessage={'Upgrade {count, plural, one {# integration} other {# integrations}}'}
          values={{
            count: selectedItems.length,
          }}
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="uninstall"
        icon="trash"
        disabled={hasUninstallableIntegrations}
        onClick={openUninstallModal}
      >
        {hasUninstallableIntegrations ? (
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.uninstallDisabledTooltip"
                defaultMessage="Can't uninstall integrations that are attached to agent policies"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.bulkUninstallButton"
              defaultMessage={
                'Uninstall {count, plural, one {# integration} other {# integrations}}'
              }
              values={{
                count: selectedItems.length,
              }}
            />
          </EuiToolTip>
        ) : (
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.bulkUninstallButton"
            defaultMessage={'Uninstall {count, plural, one {# integration} other {# integrations}}'}
            values={{
              count: selectedItems.length,
            }}
          />
        )}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="rollback"
        icon="returnKey"
        disabled={!hasRollbackableIntegrations}
        onClick={openRollbackModal}
      >
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.bulkRollbackButton"
          defaultMessage={'Rollback {count, plural, one {# integration} other {# integrations}}'}
          values={{
            count: selectedItems.length,
          }}
        />
      </EuiContextMenuItem>,
    ];
  }, [selectedItems, openUninstallModal, openUpgradeModal, openRollbackModal]);

  return (
    <EuiPopover
      id="fleet.epmInstalledIntegrations.bulkActionPopover"
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
