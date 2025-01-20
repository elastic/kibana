/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiLink } from '@elastic/eui';

export const DocsLinkSubtitle = React.memo(() => {
  const { docLinks } = useKibana().services;
  return (
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="xpack.automaticImport.createIntegrationUpload.uploadHelpText"
        defaultMessage="For more information, refer to {link}"
        values={{
          link: (
            <EuiLink href={docLinks?.links.integrationDeveloper.upload} target="_blank">
              <FormattedMessage
                id="xpack.automaticImport.createIntegrationUpload.documentation"
                defaultMessage="Upload an Integration"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
});
DocsLinkSubtitle.displayName = 'DocsLinkSubtitle';
