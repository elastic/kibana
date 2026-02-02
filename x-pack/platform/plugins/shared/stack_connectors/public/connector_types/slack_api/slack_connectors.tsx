/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from '@kbn/core/public';

import type { FieldValidateResponse } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useFormContext,
  useFormData,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { SlackApiConfig } from '@kbn/connector-schemas/slack_api';
import * as i18n from './translations';

interface AllowedChannels {
  id: string;
  name: string;
}

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

const areChannelsValid = (channels: AllowedChannels[]) => {
  if (channels.length === 0) {
    return true;
  }

  const areAllValid = channels.every((channel) => channel.name.startsWith('#'));

  if (areAllValid) {
    return true;
  }

  return false;
};

const getAllowedChannlesConfigSchema = (
  euiFieldProps: ConfigFieldSchema['euiFieldProps']
): ConfigFieldSchema<AllowedChannels[]> => ({
  id: 'allowedChannels',
  isRequired: false,
  label: i18n.ALLOWED_CHANNELS,
  type: 'COMBO_BOX',
  validations: [
    {
      isBlocking: true,
      validator: (args) => {
        const isValid = areChannelsValid(args.value);

        if (isValid) {
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
    ...euiFieldProps,
    noSuggestions: true,
    autoComplete: 'off',
    append: (
      <EuiText size="xs" color="subdued">
        {i18n.OPTIONAL_LABEL}
      </EuiText>
    ),
  },
});

export const SlackActionFieldsComponents: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;
  const { getFields } = useFormContext();

  const [{ config }] = useFormData({
    watch: ['config.allowedChannels'],
  });

  const { allowedChannels = [] }: SlackApiConfig = config ?? {};

  const selectedOptions = allowedChannels.map((channel) => ({
    label: channel.name,
    value: channel,
  }));

  const fields = getFields();

  const allowedChannelsField = fields['config.allowedChannels'];

  const onCreateOption = useCallback(
    (value: string) => {
      const finalValue = { name: value };

      const { isValid } = allowedChannelsField.validate({
        value: [finalValue],
        validationType: VALIDATION_TYPES.ARRAY_ITEM,
      }) as FieldValidateResponse;

      if (!isValid) {
        return false;
      }

      allowedChannelsField.setValue([...allowedChannels, finalValue]);
    },
    [allowedChannels, allowedChannelsField]
  );

  const onChange = useCallback(
    (options: EuiComboBoxOptionOption<AllowedChannels>[]) => {
      allowedChannelsField.setValue(
        options.map((option) => ({ name: option.value?.name, id: option.value?.id }))
      );
    },
    [allowedChannelsField]
  );

  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={[
        getAllowedChannlesConfigSchema({ onChange, onCreateOption, selectedOptions }),
      ]}
      secretsFormSchema={getSecretsFormSchema(docLinks)}
    />
  );
};

const SlackActionFields = React.memo(SlackActionFieldsComponents);

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
