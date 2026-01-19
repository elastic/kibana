/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { DEFAULT_URL } from './constants';
import * as i18n from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The Jira Service Management API base URL."
        id="xpack.stackConnectors.components.jiraServiceManagement.apiUrlDescription"
      />
    ),
  },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The JSM API authentication key for HTTP Basic authentication. For more details about generating JSM integration API keys, refer to the {jsmAPIKeyDocs}."
        id="xpack.stackConnectors.components.jiraServiceManagement.apiKeyDocumentation"
        values={{
          jsmAPIKeyDocs: (
            <EuiLink
              href="https://support.atlassian.com/jira-service-management-cloud/docs/set-up-an-api-integration/#Set-up-the-integration"
              target="_blank"
            >
              {i18n.JIRA_SERVICE_MANAGEMENT_DOCUMENTATION}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const JiraServiceManagementConnectorParams: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={configFormSchema}
      secretsFormSchema={secretsFormSchema}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraServiceManagementConnectorParams as default };
