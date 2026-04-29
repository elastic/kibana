/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const mcpFieldStrings = {
  serverUrl: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.serverUrlLabel', {
      defaultMessage: 'Server URL',
    }),
  },
  additionalSettings: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.additionalSettingsLabel', {
      defaultMessage: 'Additional settings',
    }),
  },
};

export const mcpErrorStrings = {
  required: (label: string) =>
    i18n.translate('xpack.stackConnectors.components.mcp.error.requireFieldText', {
      defaultMessage: `{label} is required.`,
      values: { label },
    }),
  invalid: (label: string) =>
    i18n.translate('xpack.stackConnectors.components.mcp.error.invalidURL', {
      defaultMessage: 'Invalid {label}',
      values: { label },
    }),
};

export const mcpParamsStrings = {
  subAction: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.subActionLabel', {
      defaultMessage: 'Action',
    }),
  },
  params: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.paramsLabel', {
      defaultMessage: 'Parameters',
    }),
  },
};

export const mcpParamsErrorStrings = {
  invalidJson: i18n.translate('xpack.stackConnectors.components.mcp.error.invalidJson', {
    defaultMessage: 'Parameters must be valid JSON.',
  }),
  required: i18n.translate('xpack.stackConnectors.components.mcp.error.required', {
    defaultMessage: 'Parameters are required.',
  }),
};
