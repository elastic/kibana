/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCallOut, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { InstalledPackageUIPackageListItem } from '../types';

export const ConfirmBulkUninstallModal: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
  onClose: () => void;
  onConfirm: () => void;
}> = ({ onClose, onConfirm, selectedItems }) => {
  const [isLoading, setIsLoading] = useState(false);

  const isSingleItem = selectedItems.length === 1;
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        isSingleItem
          ? i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.singleTitle', {
              defaultMessage: 'Uninstall {integrationName} ',
              values: {
                integrationName: selectedItems[0].title,
              },
            })
          : i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.title', {
              defaultMessage: 'Uninstall {countIntegrations} integrations ',
              values: {
                countIntegrations: selectedItems.length,
              },
            })
      }
      confirmButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUninstallModal.confirmButton',
        {
          defaultMessage: 'Uninstall {itemsCount, plural, one {integration} other {integrations}} ',
          values: { itemsCount: selectedItems.length },
        }
      )}
      buttonColor="danger"
      cancelButtonText={
        isSingleItem
          ? i18n.translate(
              'xpack.fleet.installedIntegrations.bulkUninstallModal.cancelSingleButton',
              { defaultMessage: 'Cancel' }
            )
          : i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.cancelButton', {
              defaultMessage: 'Review and edit selection',
            })
      }
      onCancel={onClose}
      isLoading={isLoading}
      onConfirm={async () => {
        try {
          setIsLoading(true);
          await onConfirm();
          onClose();
        } catch (err) {
          setIsLoading(false);
        }
      }}
    >
      <EuiCallOut
        color="danger"
        iconType="info"
        title={i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.calloutTitle', {
          defaultMessage: 'This action cannot be undone.',
        })}
      >
        {isSingleItem ? (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkUninstallModal.calloutContentSingleItem"
            defaultMessage="All Kibana and Elasticsearch assets created by this integration will be also removed."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkUninstallModal.calloutContent"
            defaultMessage="All Kibana and Elasticsearch assets created by these integrations will be also removed. Review and edit your selection if needed."
          />
        )}
      </EuiCallOut>
    </EuiConfirmModal>
  );
};
