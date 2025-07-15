/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nMessages = {
  paramUnusedWarning: (name: string) =>
    i18n.translate('xpack.onechat.tools.newTool.paramUnusedWarning', {
      defaultMessage: 'Parameter "{name}" is not used in the ES|QL query.',
      values: { name },
    }),
  paramNameLabel: i18n.translate('xpack.onechat.tools.newTool.paramNameLabel', {
    defaultMessage: 'Name',
  }),
  paramDescriptionLabel: i18n.translate('xpack.onechat.tools.newTool.paramDescriptionLabel', {
    defaultMessage: 'Description',
  }),
  paramTypeLabel: i18n.translate('xpack.onechat.tools.newTool.paramTypeLabel', {
    defaultMessage: 'Type',
  }),
  removeParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.removeParamButtonLabel', {
    defaultMessage: 'Remove parameter',
  }),
  addParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.addParamButtonLabel', {
    defaultMessage: 'Add parameter',
  }),
  inferParamsButtonLabel: i18n.translate('xpack.onechat.tools.newTool.inferParamsButtonLabel', {
    defaultMessage: 'Infer parameters from query',
  }),
  noParamsMessage: i18n.translate('xpack.onechat.tools.newTool.noParamsMessage', {
    defaultMessage: 'Add parameters or infer them from your ES|QL query.',
  }),
};
