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
import { SimpleConnectorForm, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from '@kbn/core/public';

import * as i18n from './translations';

const getSecretsFormSchema = (docLinks: DocLinksStart): SecretsFieldSchema[] => [
  {
    id: 'token',
    label: i18n.TOKEN_LABEL,
    isPasswordField: true,
    helpText: (
      <EuiLink href={docLinks.links.alerting.slackApiAction} target="_blank">
        <FormattedMessage
          id="xpack.stackConnectors.components.slack_api.apiKeyDocumentation"
          defaultMessage="Create a Slack Web API token"
        />
      </EuiLink>
    ),
  },
];

const getConfigFormSchema = (): ConfigFieldSchema<string>[] => [
  {
    id: 'allowedChannels',
    isRequired: false,
    label: i18n.ALLOWED_CHANNELS,
    type: 'COMBO_BOX',
    validations: [
      {
        isBlocking: true,
        validator: (args) => {
          const valueAsArray = Array.isArray(args.value) ? args.value : [args.value];

          if (valueAsArray.length === 0) {
            return;
          }

          const areAllValid = valueAsArray.every((value) => value.startsWith('#'));

          if (areAllValid) {
            return;
          }

          return {
            code: 'ERR_FIELD_FORMAT',
            formatType: 'COMBO_BOX',
            message: i18n.CHANNEL_NAME_ERROR,
          };
        },
      },
    ],
    euiFieldProps: {
      noSuggestions: true,
      autoComplete: 'off',
      append: (
        <EuiText size="xs" color="subdued">
          {i18n.OPTIONAL_LABEL}
        </EuiText>
      ),
    },
  },
];

export const SlackActionFieldsComponents: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={getConfigFormSchema()}
      secretsFormSchema={getSecretsFormSchema(docLinks)}
    />
  );
};

const SlackActionFields = React.memo(SlackActionFieldsComponents);

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
