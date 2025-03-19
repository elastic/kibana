/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const PermissionDenied = () => (
  <KibanaPageTemplate.EmptyPrompt
    iconType="securityApp"
    color="danger"
    title={
      <h2 data-test-subj="apiKeysPermissionDeniedMessage">
        <FormattedMessage
          id="xpack.security.management.apiKeys.deniedPermissionTitle"
          defaultMessage="You need permission to manage API keys"
        />
      </h2>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.security.management.apiKeys.noPermissionToManageRolesDescription"
          defaultMessage="Contact your system administrator."
        />
      </p>
    }
  />
);
