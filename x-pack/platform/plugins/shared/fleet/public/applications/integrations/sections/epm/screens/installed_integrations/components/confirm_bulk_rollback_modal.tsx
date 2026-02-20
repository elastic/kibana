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

export const ConfirmBulkRollbackModal: React.FunctionComponent<{
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
          ? i18n.translate('xpack.fleet.installedIntegrations.bulkRollbackModal.singleTitle', {
              defaultMessage: 'Rollback {integrationName} to version {previousVersion}',
              values: {
                integrationName: selectedItems[0].title,
                previousVersion: selectedItems[0].installationInfo?.previous_version,
              },
            })
          : i18n.translate('xpack.fleet.installedIntegrations.bulkRollbackModal.title', {
              defaultMessage: 'Rollback {countIntegrations} integrations ',
              values: {
                countIntegrations: selectedItems.length,
              },
            })
      }
      confirmButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkRollbackModal.confirmButton',
        {
          defaultMessage: 'Rollback {itemsCount, plural, one {integration} other {integrations}} ',
          values: { itemsCount: selectedItems.length },
        }
      )}
      buttonColor="primary"
      cancelButtonText={
        isSingleItem
          ? i18n.translate(
              'xpack.fleet.installedIntegrations.bulkRollbackModal.cancelSingleButton',
              { defaultMessage: 'Cancel' }
            )
          : i18n.translate('xpack.fleet.installedIntegrations.bulkRollbackModal.cancelButton', {
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
        color="warning"
        iconType="info"
        title={i18n.translate('xpack.fleet.installedIntegrations.bulkRollbackModal.calloutTitle', {
          defaultMessage: 'This action impacts all integration policies and assets.',
        })}
      >
        {isSingleItem ? (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkRollbackModal.calloutContentSingleItem"
            defaultMessage="The integration will be rolled back to the previous version including assets and integration policies. Agents using the integration will receive the policy change."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.installedIntegrations.bulkRollbackModal.calloutContent"
            defaultMessage="All integrations will be rolled back to the previous version including assets and integration policies. Agents using the integrations will receive the policy change."
          />
        )}
      </EuiCallOut>
    </EuiConfirmModal>
  );
};
