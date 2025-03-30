/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { InstalledPackageUIPackageListItem } from '../types';

export const ConfirmBulkUpgradeModal: React.FunctionComponent<{
  selectedItems: InstalledPackageUIPackageListItem[];
  onClose: () => void;
  onConfirm: (params: { updatePolicies: boolean }) => void;
}> = ({ onClose, onConfirm, selectedItems }) => {
  const [updatePolicies, setUpdatePolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.fleet.installedIntegrations.bulkUpgradeModal.title', {
        defaultMessage: 'Upgrade {countIntegrations} integrations and {countPolicies} policies',
        values: {
          countIntegrations: selectedItems.length,
          countPolicies: selectedItems.reduce(
            (acc, item) => acc + (item.packagePoliciesInfo?.count ?? 0),
            0
          ),
        },
      })}
      confirmButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUpgradeModal.confirmButton',
        { defaultMessage: 'Upgrade to latest version' }
      )}
      cancelButtonText={i18n.translate(
        'xpack.fleet.installedIntegrations.bulkUpgradeModal.cancelButton',
        { defaultMessage: 'Review integration selection' }
      )}
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
        <FormattedMessage
          id="xpack.fleet.installedIntegrations.bulkUpgradeModal.description"
          defaultMessage={
            'We will upgrade your integrations and policies to the latest available version.'
          }
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFormRow fullWidth>
        <EuiSwitch
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
      <EuiCallOut
        iconType="iInCircle"
        title={i18n.translate(
          'xpack.fleet.installedIntegrations.bulkUpgradeModal.policiesCallout',
          {
            defaultMessage:
              'When enabled, Fleet will attempt to upgrade and deploy integration policies automatically.',
          }
        )}
      />
    </EuiConfirmModal>
  );
};
