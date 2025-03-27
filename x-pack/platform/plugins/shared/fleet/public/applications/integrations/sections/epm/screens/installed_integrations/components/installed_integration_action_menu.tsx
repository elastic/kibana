/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { useStartServices } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';
import { useBulkActions } from '../hooks/use_bulk_actions';

import { ConfirmBulkUpgradeModal } from './confirm_bulk_upgrade_modal';

export const InstalledIntegrationsActionMenu: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
}> = ({ selectedItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const startServices = useStartServices();

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
    actions: { bulkUpgradeIntegrations },
  } = useBulkActions();

  const openUpgradeModal = useCallback(() => {
    setIsOpen(false);
    const ref = startServices.overlays.openModal(
      toMountPoint(
        <ConfirmBulkUpgradeModal
          onClose={() => {
            ref.close();
          }}
          onConfirm={({ updatePolicies }) => bulkUpgradeIntegrations(selectedItems, updatePolicies)}
          selectedItems={selectedItems}
        />,
        startServices
      )
    );
  }, [selectedItems, startServices, bulkUpgradeIntegrations]);

  const items = useMemo(() => {
    const hasUpgreadableIntegrations = selectedItems.some(
      (item) =>
        item.ui.installation_status === 'upgrade_available' ||
        item.ui.installation_status === 'upgrade_failed' ||
        item.ui.installation_status === 'install_failed'
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
      <EuiContextMenuItem key="edit" icon="pencil" onClick={() => {}}>
        TODO other actions
      </EuiContextMenuItem>,
    ];
  }, [selectedItems, openUpgradeModal]);

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
