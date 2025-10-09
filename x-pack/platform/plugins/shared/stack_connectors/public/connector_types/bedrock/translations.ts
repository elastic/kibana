/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const ACCESS_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.accessKeySecret',
  {
    defaultMessage: 'Access Key',
  }
);
export const DEFAULT_MODEL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.defaultModelTextFieldLabel',
  {
    defaultMessage: 'Default model',
  }
);

export const SECRET = i18n.translate('xpack.stackConnectors.components.bedrock.secret', {
  defaultMessage: 'Secret',
});

export const BEDROCK = i18n.translate('xpack.stackConnectors.components.bedrock.title', {
  defaultMessage: 'Amazon Bedrock',
});

export const DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.bedrock.documentation',
  {
    defaultMessage: 'documentation',
  }
);

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.urlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.bedrock.error.requiredBedrockBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);
export const BODY_INVALID = i18n.translate(
  'xpack.stackConnectors.security.bedrock.params.error.invalidBodyText',
  {
    defaultMessage: 'Body does not have a valid JSON format.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.bedrock.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.bedrock.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const BODY = i18n.translate('xpack.stackConnectors.components.bedrock.bodyFieldLabel', {
  defaultMessage: 'Body',
});
export const BODY_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.bedrock.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const MODEL = i18n.translate('xpack.stackConnectors.components.bedrock.model', {
  defaultMessage: 'Model',
});

export const USAGE_DASHBOARD_LINK = (apiProvider: string, connectorName: string) =>
  i18n.translate('xpack.stackConnectors.components.genAi.dashboardLink', {
    values: { apiProvider, connectorName },
    defaultMessage: 'View {apiProvider} Usage Dashboard for "{ connectorName }" Connector',
  });

export const EXTENDED_THINKING_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.extendedThinkingLabel',
  {
    defaultMessage: 'Extended thinking (experimental)',
  }
);

export const EXTENDED_THINKING_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.bedrock.extendedThinkingDescription',
  {
    defaultMessage:
      'Enable extended thinking for enhanced reasoning capabilities on complex tasks. Only available for Claude Sonnet 4+ and Opus 4+ models.',
  }
);

export const EXTENDED_THINKING_BUDGET_TOKENS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.bedrock.extendedThinkingBudgetTokensLabel',
  {
    defaultMessage: 'Budget tokens',
  }
);

export const EXTENDED_THINKING_BUDGET_TOKENS_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.bedrock.extendedThinkingBudgetTokensDescription',
  {
    defaultMessage:
      'Maximum number of tokens Claude can use for internal reasoning. Higher values may improve response quality for complex problems.',
  }
);

export const EXTENDED_THINKING_MODEL_NOT_SUPPORTED = i18n.translate(
  'xpack.stackConnectors.components.bedrock.extendedThinkingModelNotSupported',
  {
    defaultMessage:
      'Extended thinking is only available for Claude Sonnet 4+, Opus 4+, and Claude 3.7 Sonnet models.',
  }
);
