/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationLinks } from '../../services/documentation_links';

interface Props {
  isAdmin: boolean;
}

export const EmptyPrompt: React.FunctionComponent<Props> = ({ isAdmin }) => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h1>
        {isAdmin ? (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptAdminTitle"
            defaultMessage="No API keys"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptNonAdminTitle"
            defaultMessage="You don't have any API keys"
          />
        )}
      </h1>
    }
    body={
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptDescription"
            defaultMessage="You can create an {link} from Console."
            values={{
              link: (
                <EuiLink href={documentationLinks.getCreateApiKeyDocUrl()} target="_blank">
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.emptyPromptDocsLinkMessage"
                    defaultMessage="API key"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </Fragment>
    }
    actions={
      <EuiButton type="primary" href="#/dev_tools">
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.emptyPromptConsoleButtonMessage"
          defaultMessage="Go to Console"
        />
      </EuiButton>
    }
    data-test-subj="emptyPrompt"
  />
);
