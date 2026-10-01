/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import { investigationEvidenceSchema, MAX_EVIDENCE_TEXT_LENGTH } from '../../../common/evidence';
import {
  MAX_HYPOTHESES,
  MAX_HYPOTHESIS_EVIDENCE,
  SET_HYPOTHESES_TOOL_ID,
} from '../../../common/hypotheses/constants';
import { hypothesisStatusSchema, type Hypothesis } from '../../../common/hypotheses/hypotheses';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { HypothesesService } from '../services/hypotheses_service';

const setHypothesisSchema = z.object({
  candidate: z
    .string()
    .min(1)
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .describe('The candidate cause under consideration, stated concretely.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Current confidence in this hypothesis, from 0 to 1.'),
  status: hypothesisStatusSchema.describe(
    '"investigating" while open, "dismissed" once ruled out, "confirmed" for the root cause.'
  ),
  reason: z
    .string()
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .optional()
    .describe(
      'Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown.'
    ),
  evidence: z
    .array(investigationEvidenceSchema)
    .max(MAX_HYPOTHESIS_EVIDENCE)
    .optional()
    .describe('What the status rests on, ideally a chart of the signal that supports it.'),
});

export const setHypothesesToolSchema = z.object({
  hypotheses: z
    .array(setHypothesisSchema)
    .max(MAX_HYPOTHESES)
    .describe(
      'Every hypothesis considered so far, each with its own confidence and status, not only those that changed.'
    ),
});

export type SetHypothesesToolParams = z.infer<typeof setHypothesesToolSchema>;

const DESCRIPTION =
  'Record the hypotheses of the investigation, so the user sees them and they are kept with the conversation. ' +
  'This is a snapshot, not a diff: every call must include every hypothesis considered so far, each with its own confidence and status, and replaces the stored list. ' +
  'Call it whenever a hypothesis is added, its confidence changes, or its status changes (investigating, dismissed, confirmed). ' +
  'It does not end the investigation; keep working after calling it.';

export const MULTIPLE_CONFIRMED_WARNING =
  'More than one hypothesis is "confirmed". Report a single root cause for the triggering symptom: merge candidates that jointly produce it, or that are downstream effects of it, into one "confirmed" hypothesis, and mark candidates that do not produce it "dismissed" with a reason saying why. Send a corrected report before your final output.';

export const REMOVED_HYPOTHESES_ATTACHMENT_NOTE =
  'The user removed the hypotheses attachment from this conversation. The hypotheses were recorded but are not shown in the conversation.';

/** Corrections the agent should make before its final output; empty when the list is fine. */
export const getHypothesesWarnings = (hypotheses: Hypothesis[]): string[] =>
  hypotheses.filter(({ status }) => status === 'confirmed').length > 1
    ? [MULTIPLE_CONFIRMED_WARNING]
    : [];

/** `investigations.set_hypotheses`: the agent's write path for `investigation_hypotheses`. */
export const createSetHypothesesTool = ({
  getHypothesesService,
  resolveUser,
  privileges,
  logger,
}: {
  getHypothesesService: () => HypothesesService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_HYPOTHESES_TOOL_ID,
    description: DESCRIPTION,
    schema: setHypothesesToolSchema,
    annotations: {
      title: 'Set Investigation Hypotheses',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async ({ hypotheses }, { context, conversationId }) => {
      const user = await resolveUser(context.request);
      const { document, attachment } = await getHypothesesService().setFromTool({
        context,
        conversationId,
        hypotheses,
        user,
      });

      const notes = [
        ...getHypothesesWarnings(document.hypotheses),
        ...(attachment === 'removed_by_user' ? [REMOVED_HYPOTHESES_ATTACHMENT_NOTE] : []),
      ];

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: document.id,
            ...(notes.length > 0 && { warning: notes.join(' ') }),
          }),
        ],
      };
    },
  });
