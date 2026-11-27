/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

function isHttpForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const withResponse = error as { response?: { status?: number } };
  if (withResponse.response?.status === 403) {
    return true;
  }
  const withStatus = error as { statusCode?: number };
  return withStatus.statusCode === 403;
}

export function formatTriggerEventQueryError(error: unknown): string {
  if (isHttpForbiddenError(error)) {
    return i18n.translate('workflows.workflowExecuteEventTriggerForm.forbiddenErrorBody', {
      defaultMessage:
        'You need the Workflows "Read Workflow Execution" privilege to search trigger events.',
    });
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return i18n.translate('workflows.workflowExecuteEventTriggerForm.unknownError', {
    defaultMessage: 'Request failed',
  });
}
