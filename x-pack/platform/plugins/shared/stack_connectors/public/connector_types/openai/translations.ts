/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_KEY_LABEL = i18n.translate('xpack.stackConnectors.components.genAi.apiKeySecret', {
  defaultMessage: 'API key',
});

export const DEFAULT_MODEL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.defaultModelTextFieldLabel',
  {
    defaultMessage: 'Default model',
  }
);

export const ORG_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.orgIdTextFieldLabel',
  {
    defaultMessage: 'OpenAI Organization',
  }
);

export const PROJECT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.projectIdTextFieldLabel',
  {
    defaultMessage: 'OpenAI Project',
  }
);

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const API_PROVIDER_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.apiProviderLabel',
  {
    defaultMessage: 'Select an OpenAI provider',
  }
);

export const OPENAI = i18n.translate('xpack.stackConnectors.components.genAi.openAi', {
  defaultMessage: 'OpenAI',
});

export const AZURE_AI = i18n.translate('xpack.stackConnectors.components.genAi.azureAi', {
  defaultMessage: 'Azure OpenAI',
});

export const OTHER_OPENAI = i18n.translate('xpack.stackConnectors.components.genAi.otherAi', {
  defaultMessage: 'Other (OpenAI Compatible Service)',
});

export const DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.genAi.documentation',
  {
    defaultMessage: 'documentation',
  }
);

export const CERT_DATA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.certificateDataLabel',
  {
    defaultMessage: 'Certificate file',
  }
);

export const CERT_DATA_DESC = i18n.translate(
  'xpack.stackConnectors.components.genAi.certificateDataDocumentation',
  {
    defaultMessage: 'Raw PKI certificate content (PEM format) for cloud or on-premise deployments.',
  }
);

export const KEY_DATA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.privateKeyDataLabel',
  {
    defaultMessage: 'Private key file',
  }
);

export const KEY_DATA_DESC = i18n.translate(
  'xpack.stackConnectors.components.genAi.privateKeyDataDocumentation',
  {
    defaultMessage: 'Raw PKI private key content (PEM format) for cloud or on-premise deployments.',
  }
);

export const VERIFICATION_MODE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.verificationModeLabel',
  {
    defaultMessage: 'SSL verification mode',
  }
);

export const VERIFICATION_MODE_DESC = i18n.translate(
  'xpack.stackConnectors.components.genAi.verificationModeDocumentation',
  {
    defaultMessage:
      'Controls SSL/TLS certificate verification: `Full` verifies both certificate and hostname, `Certificate` verifies the certificate but not the hostname, `None` skips all verification. Use `None` cautiously for testing purposes.',
  }
);

export const VERIFICATION_MODE_FULL = i18n.translate(
  'xpack.stackConnectors.components.genAi.verificationModeFullLabel',
  {
    defaultMessage: 'Full (Certificate and Hostname)',
  }
);

export const VERIFICATION_MODE_CERTIFICATE = i18n.translate(
  'xpack.stackConnectors.components.genAi.verificationModeCertificateLabel',
  {
    defaultMessage: 'Certificate Only',
  }
);

export const VERIFICATION_MODE_NONE = i18n.translate(
  'xpack.stackConnectors.components.genAi.verificationModeNoneLabel',
  {
    defaultMessage: 'None (Skip Verification)',
  }
);

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.urlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.genAi.error.requiredGenerativeAiBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);
export const BODY_INVALID = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.invalidBodyText',
  {
    defaultMessage: 'Body does not have a valid JSON format.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const API_PROVIDER_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.genAi.error.requiredApiProviderText',
  {
    defaultMessage: 'API provider is required.',
  }
);

export const USAGE_DASHBOARD_LINK = (apiProvider: string, connectorName: string) =>
  i18n.translate('xpack.stackConnectors.components.genAi.dashboardLink', {
    values: { apiProvider, connectorName },
    defaultMessage: 'View {apiProvider} Usage Dashboard for "{ connectorName }" Connector',
  });

export const PKI_MODE_LABEL = i18n.translate('xpack.stackConnectors.genAi.pkiModeLabel', {
  defaultMessage: 'Enable PKI Authentication',
});

export const CA_DATA_LABEL = i18n.translate('xpack.stackConnectors.components.genAi.caDataLabel', {
  defaultMessage: 'CA certificate file',
});

export const CA_DATA_DESC = i18n.translate(
  'xpack.stackConnectors.components.genAi.caDataDocumentation',
  {
    defaultMessage: 'Raw CA certificate content (PEM) used to verify the server certificate.',
  }
);
