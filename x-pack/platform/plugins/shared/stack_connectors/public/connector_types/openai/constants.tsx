/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigFieldSchema, SecretsFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';
import { DEFAULT_OPENAI_MODEL, OpenAiProviderType } from '../../../common/openai/constants';
import * as i18n from './translations';
import { Config } from './types';

export const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions' as const;
export const DEFAULT_URL_AZURE =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}' as const;

const DEFAULT_BODY = `{
    "messages": [{
        "role":"user",
        "content":"Hello world"
    }]
}`;
const DEFAULT_BODY_AZURE = `{
    "messages": [{
        "role":"user",
        "content":"Hello world"
    }]
}`;
const DEFAULT_BODY_OTHER = (defaultModel: string) => `{
    "model": "${defaultModel}",
    "messages": [{
        "role":"user",
        "content":"Hello world"
    }]
}`;

export const getDefaultBody = (config?: Config) => {
  if (!config) {
    // default to OpenAiProviderType.OpenAi sample data
    return DEFAULT_BODY;
  }
  if (config?.apiProvider === OpenAiProviderType.Other) {
    // update sample data if Other (OpenAI Compatible Service)
    return config.defaultModel ? DEFAULT_BODY_OTHER(config.defaultModel) : DEFAULT_BODY;
  }
  if (config?.apiProvider === OpenAiProviderType.AzureAi) {
    // update sample data if AzureAi
    return DEFAULT_BODY_AZURE;
  }
  // default to OpenAiProviderType.OpenAi sample data
  return DEFAULT_BODY;
};

const contextWindowField: ConfigFieldSchema = {
  id: 'contextWindowLength',
  label: i18n.CONTEXT_WINDOW_LABEL,
  isRequired: false,
  helpText: (
    <FormattedMessage
      defaultMessage="Can be set to manually define the context length of the default model used by the connector. Useful for open source models or models more recent than this version of Kibana"
      id="xpack.stackConnectors.components.genAi.contextWindowLengthTextHelpText"
    />
  ),
  euiFieldProps: {
    append: (
      <EuiText size="xs" color="subdued">
        {i18n.OPTIONAL_LABEL}
      </EuiText>
    ),
  },
};

export const openAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL,
    requireTld: false,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.openAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              data-test-subj="open-ai-api-doc"
              href="https://platform.openai.com/docs/api-reference"
              target="_blank"
            >
              {`${i18n.OPENAI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    id: 'defaultModel',
    label: i18n.DEFAULT_MODEL_LABEL,
    helpText: (
      <FormattedMessage
        defaultMessage="If a request does not include a model, it uses the default."
        id="xpack.stackConnectors.components.genAi.openAiDocumentationModel"
      />
    ),
    defaultValue: DEFAULT_OPENAI_MODEL,
  },
  contextWindowField,
  {
    id: 'organizationId',
    label: i18n.ORG_ID_LABEL,
    isRequired: false,
    helpText: (
      <FormattedMessage
        defaultMessage="For users who belong to multiple organizations. Organization IDs can be found on your Organization settings page."
        id="xpack.stackConnectors.components.genAi.openAiOrgId"
      />
    ),
    euiFieldProps: {
      append: (
        <EuiText size="xs" color="subdued">
          {i18n.OPTIONAL_LABEL}
        </EuiText>
      ),
    },
  },
  {
    id: 'projectId',
    label: i18n.PROJECT_ID_LABEL,
    isRequired: false,
    helpText: (
      <FormattedMessage
        defaultMessage="For users who are accessing their projects through their legacy user API key. Project IDs can be found on your General settings page by selecting the specific project."
        id="xpack.stackConnectors.components.genAi.openAiProjectId"
      />
    ),
    euiFieldProps: {
      autocomplete: 'new-password',
      autoComplete: 'new-password',
      onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
        event.target.setAttribute('autocomplete', 'new-password');
      },
      append: (
        <EuiText size="xs" color="subdued">
          {i18n.OPTIONAL_LABEL}
        </EuiText>
      ),
    },
  },
];

export const azureAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    requireTld: false,
    defaultValue: DEFAULT_URL_AZURE,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              data-test-subj="azure-ai-api-doc"
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  contextWindowField,
];

export const otherOpenAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    requireTld: false,
    helpText: (
      <FormattedMessage
        defaultMessage="The Other (OpenAI Compatible Service) endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.otherOpenAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              data-test-subj="other-ai-api-doc"
              href="https://www.elastic.co/guide/en/security/current/connect-to-byo-llm.html"
              target="_blank"
            >
              {`${i18n.OTHER_OPENAI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    id: 'defaultModel',
    label: i18n.DEFAULT_MODEL_LABEL,
    helpText: (
      <FormattedMessage
        defaultMessage="If a request does not include a model, it uses the default."
        id="xpack.stackConnectors.components.genAi.otherOpenAiDocumentationModel"
      />
    ),
  },
  contextWindowField,
];

export const openAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API authentication key for HTTP Basic authentication. For more details about generating OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.openAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              data-test-subj="open-ai-api-keys-doc"
              href="https://platform.openai.com/account/api-keys"
              target="_blank"
            >
              {`${i18n.OPENAI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

export const azureAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure API key for HTTP Basic authentication. For more details about generating Azure OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              data-test-subj="azure-ai-api-keys-doc"
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#authentication"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

export const getOtherOpenAiSecrets = (isRequired = true): SecretsFieldSchema[] => [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    isRequired,
    helpText: (
      <FormattedMessage
        defaultMessage="The Other (OpenAI Compatible Service) API key for HTTP Basic authentication. For more details about generating Other model API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.otherOpenAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              data-test-subj="other-ai-api-keys-doc"
              href="https://www.elastic.co/guide/en/security/current/connect-to-byo-llm.html"
              target="_blank"
            >
              {`${i18n.OTHER_OPENAI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

export const providerOptions = [
  {
    value: OpenAiProviderType.OpenAi,
    text: i18n.OPENAI,
    label: i18n.OPENAI,
  },
  {
    value: OpenAiProviderType.AzureAi,
    text: i18n.AZURE_AI,
    label: i18n.AZURE_AI,
  },
  {
    value: OpenAiProviderType.Other,
    text: i18n.OTHER_OPENAI,
    label: i18n.OTHER_OPENAI,
  },
];
