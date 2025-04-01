/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { InstalledPackageUIPackageListItem } from '../types';

export const ConfirmBulkUninstallModal: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
  onClose: () => void;
  onConfirm: () => void;
}> = ({ onClose, onConfirm, selectedItems }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.title', {
        defaultMessage: 'Uninstall {countIntegrations} integrations ',
        values: {
          countIntegrations: selectedItems.length,
        },
      })}
      confirmButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUninstallModal.confirmButton',
        { defaultMessage: 'Uninstall integrations' }
      )}
      buttonColor="danger"
      cancelButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUninstallModal.cancelButton',
        { defaultMessage: 'Review and edit selection' }
      )}
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
        iconType="iInCircle"
        title={i18n.translate('xpack.fleet.installedIntegrations.bulkUninstallModal.calloutTitle', {
          defaultMessage: 'This action cannot be undone.',
        })}
        content={i18n.translate(
          'xpack.fleet.installedIntegrations.bulkUninstallModal.calloutContent',
          {
            defaultMessage:
              'All Kibana and Elasticsearch assets created by these integrations will be also removed. Review and edit your selection if needed.',
          }
        )}
      />
    </EuiConfirmModal>
  );
};
