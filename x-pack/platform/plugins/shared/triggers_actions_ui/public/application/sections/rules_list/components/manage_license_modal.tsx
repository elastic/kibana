/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { capitalize } from 'lodash';

import { ConnectorContext } from '../../../context/connector_context';

interface Props {
  licenseType: string;
  ruleTypeId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ManageLicenseModal: React.FC<Props> = ({
  licenseType,
  ruleTypeId,
  onConfirm,
  onCancel,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const licenseRequired = capitalize(licenseType);
  const isServerless = useContext(ConnectorContext)?.isServerless ?? false;
  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        isServerless
          ? i18n.translate(
              'xpack.triggersActionsUI.sections.manageLicense.upgradeSubscriptionTitle',
              {
                defaultMessage: 'Complete subscription required',
              }
            )
          : i18n.translate('xpack.triggersActionsUI.sections.manageLicense.manageLicenseTitle', {
              defaultMessage: '{licenseRequired} license required',
              values: { licenseRequired },
            })
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={
        isServerless
          ? i18n.translate(
              'xpack.triggersActionsUI.sections.manageLicense.viewSubscriptionPlansButtonText',
              {
                defaultMessage: 'View subscription plans',
              }
            )
          : i18n.translate(
              'xpack.triggersActionsUI.sections.manageLicense.manageLicenseConfirmButtonText',
              {
                defaultMessage: 'Manage license',
              }
            )
      }
      cancelButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.manageLicense.manageLicenseCancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="manageLicenseModal"
    >
      <p>
        {isServerless ? (
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.manageLicense.serverlessLicenseMessage"
            defaultMessage="Rule type {ruleTypeId} is disabled because it requires the Complete subscription tier. View subscription plans to see upgrade options."
            values={{ ruleTypeId }}
          />
        ) : (
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.manageLicense.manageLicenseMessage"
            defaultMessage="Rule type {ruleTypeId} is disabled because it requires a {licenseRequired} license. Continue to License Management to view upgrade options."
            values={{ ruleTypeId, licenseRequired }}
          />
        )}
      </p>
    </EuiConfirmModal>
  );
};
