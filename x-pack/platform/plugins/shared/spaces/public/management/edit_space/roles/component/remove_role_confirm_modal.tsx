/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import type { CoreServiceAccountsService } from '@kbn/core-security-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';
import {
  hasServiceAccountRoleUsageCallout,
  ServiceAccountRoleUsageCallout,
  useServiceAccountRoleUsage,
} from '@kbn/security-ui-components';

interface Props {
  role: Role;
  serviceAccounts: CoreServiceAccountsService;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirms removing a role from a space, warning about the service accounts that hold it. */
export const RemoveRoleConfirmModal: FC<Props> = ({
  role,
  serviceAccounts,
  onCancel,
  onConfirm,
}) => {
  const usage = useServiceAccountRoleUsage(serviceAccounts, [role.name]);

  return (
    <EuiConfirmModal
      aria-labelledby="remove-role-confirm-modal"
      titleProps={{ id: 'remove-role-confirm-modal' }}
      title={i18n.translate('xpack.spaces.management.spaceDetails.roles.removeRoleModalTitle', {
        defaultMessage: 'Remove role "{roleName}" from the space?',
        values: { roleName: role.name },
      })}
      cancelButtonText={i18n.translate(
        'xpack.spaces.management.spaceDetails.roles.removeRoleModalCancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.spaces.management.spaceDetails.roles.removeRoleModalConfirm',
        { defaultMessage: 'Confirm' }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        <FormattedMessage
          id="xpack.spaces.management.spaceDetails.roles.removeRoleModalBody"
          defaultMessage="You can't undo this operation."
        />
      </p>
      {hasServiceAccountRoleUsageCallout(usage) && (
        <>
          <EuiSpacer size="m" />
          <ServiceAccountRoleUsageCallout
            usage={usage}
            serviceAccounts={serviceAccounts}
            roleCount={1}
            action="update"
          />
        </>
      )}
    </EuiConfirmModal>
  );
};
