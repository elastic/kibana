/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationLinks } from '../../services/documentation_links';

export const NotEnabled: React.FunctionComponent = () => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorTitle"
        defaultMessage="API keys not enabled in Elasticsearch"
      />
    }
    color="danger"
    iconType="alert"
  >
    <FormattedMessage
      id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorDescription"
      defaultMessage="Contact your system administrator and refer to the {link} to enable API keys."
      values={{
        link: (
          <EuiLink href={documentationLinks.getApiKeyServiceSettingsDocUrl()} target="_blank">
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorLinkText"
              defaultMessage="docs"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);
