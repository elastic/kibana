/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const UnauthorizedPrompt = () => (
  <EuiEmptyPrompt
    iconType="spacesApp"
    iconColor={'danger'}
    title={
      <h2>
        <FormattedMessage
          id="xpack.spaces.management.unauthorizedPrompt.permissionDeniedTitle"
          defaultMessage="Permission denied"
        />
      </h2>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.spaces.management.unauthorizedPrompt.permissionDeniedDescription"
          defaultMessage="You do not have permission to manage spaces."
        />
      </p>
    }
  />
);
