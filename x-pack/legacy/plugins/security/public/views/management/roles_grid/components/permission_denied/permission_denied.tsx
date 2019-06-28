/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiEmptyPrompt, EuiFlexGroup, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const PermissionDenied = () => (
  <EuiFlexGroup gutterSize="none">
    <EuiPageContent horizontalPosition="center">
      <EuiEmptyPrompt
        iconType="securityApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.roles.deniedPermissionTitle"
              defaultMessage="You need permission to manage roles"
            />
          </h2>
        }
        body={
          <p data-test-subj="permissionDeniedMessage">
            <FormattedMessage
              id="xpack.security.management.roles.noPermissionToManageRolesDescription"
              defaultMessage="Contact your system administrator."
            />
          </p>
        }
      />
    </EuiPageContent>
  </EuiFlexGroup>
);
