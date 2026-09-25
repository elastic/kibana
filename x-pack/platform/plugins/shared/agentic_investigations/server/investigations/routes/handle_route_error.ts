/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import { isAgentBuilderError } from '@kbn/agent-builder-common';
import { WrongTemplateError } from '../../assignments/assignments_service';
import { MissingDismissReasonError } from '../services/investigation_status_service';
import { CloseTargetsChangedError } from '../services/close_targets_changed_error';

export const handleInvestigationRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof WrongTemplateError) {
    return response.notFound({ body: { message: error.message } });
  }

  if (error instanceof MissingDismissReasonError) {
    return response.badRequest({ body: { message: error.message } });
  }

  if (error instanceof CloseTargetsChangedError) {
    return response.conflict({
      body: { message: error.message, attributes: { code: error.code } },
    });
  }

  if (isAgentBuilderError(error)) {
    const statusCode = error.meta?.statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return response.customError({ statusCode, body: { message: error.message } });
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Investigation route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message: 'Internal server error' } });
};
