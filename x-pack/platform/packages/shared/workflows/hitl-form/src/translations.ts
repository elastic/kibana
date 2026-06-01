/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECT_PLACEHOLDER = i18n.translate('xpack.workflowsHitlForm.selectPlaceholder', {
  defaultMessage: 'Select a value',
});

export const NO_SCHEMA_BODY = i18n.translate('xpack.workflowsHitlForm.noSchemaBody', {
  defaultMessage:
    'This action does not declare an input schema. Submitting will send an empty response.',
});

export const REQUIRED_FIELD_ERROR = i18n.translate('xpack.workflowsHitlForm.requiredFieldError', {
  defaultMessage: 'This field is required',
});

export const agentContextVia = (toolId: string) =>
  i18n.translate('xpack.workflowsHitlForm.agentContextVia', {
    defaultMessage: 'via {toolId}',
    values: { toolId },
  });
