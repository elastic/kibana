/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import { isAgentBuilderError } from '@kbn/agent-builder-common';
import {
  InvalidLinkedInvestigationError,
  NotAnEscalationError,
  TooManyLinkedInvestigationsError,
} from '../services/errors';
import { WrongTemplateError } from '../../assignments/assignments_service';
import { CloseTargetsChangedError } from '../../investigations/services/close_targets_changed_error';
import { ProposalDismissFailedError } from '../../investigations/services/proposal_dismiss_failed_error';
import { EscalationCloseIncompleteError } from '../services/escalation_close_incomplete_error';

/**
 * Maps service errors to HTTP responses for escalation routes.
 *
 * AgentBuilderErrors carry their own statusCode in meta, so we map the 4xx
 * range through rather than re-stating the taxonomy:
 *   conversationNotFound    → 404
 *   conversationWriteConflict / conversationAlreadyExists → 409
 *   badRequest              → 400
 *   forbidden               → 403
 *   agentNotFound / agentUnavailable → 404 / 400
 *
 * Note on 404 vs 403: `getDocumentWithAccess` (client.ts:1078-1080) throws
 * conversationNotFound — *not* forbidden — when access is denied. A collaborator
 * trying to update a private escalation they do not own receives 404, not 403.
 */
export const handleEscalationRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof InvalidLinkedInvestigationError) {
    return response.badRequest({ body: { message: error.message } });
  }

  if (error instanceof TooManyLinkedInvestigationsError) {
    return response.badRequest({ body: { message: error.message } });
  }

  if (error instanceof NotAnEscalationError || error instanceof WrongTemplateError) {
    return response.notFound({ body: { message: error.message } });
  }

  if (error instanceof CloseTargetsChangedError) {
    return response.conflict({
      body: { message: error.message, attributes: { code: error.code } },
    });
  }

  if (error instanceof ProposalDismissFailedError) {
    return response.customError({
      statusCode: 500,
      body: {
        message: error.message,
        attributes: { code: error.code, failed_proposal_ids: error.failedProposalIds },
      },
    });
  }

  if (error instanceof EscalationCloseIncompleteError) {
    return response.customError({
      statusCode: 500,
      body: {
        message: error.message,
        attributes: {
          code: error.code,
          closed_investigation_ids: error.closedInvestigationIds,
          skipped_investigation_ids: error.skippedInvestigationIds,
        },
      },
    });
  }

  // ProposalForbiddenError is thrown by the proposals plugin's privilege helpers.
  // We match by name to avoid importing across plugin boundaries.
  if (error instanceof Error && error.name === 'ProposalForbiddenError') {
    return response.forbidden({ body: { message: error.message } });
  }

  if (isAgentBuilderError(error)) {
    const statusCode = error.meta?.statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return response.customError({ statusCode, body: { message: error.message } });
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Escalation route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message: 'Internal server error' } });
};
