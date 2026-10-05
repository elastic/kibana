/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import {
  investigationEvidenceSchema,
  MAX_EVIDENCE_SHORT_TEXT_LENGTH,
} from '../../../common/evidence';
import { MAX_TIMELINE_EVENTS, SET_TIMELINE_TOOL_ID } from '../../../common/timeline/constants';
import { timelineEventTypeSchema } from '../../../common/timeline/timeline';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { TimelineService } from '../services/timeline_service';

const setTimelineEventSchema = z.object({
  timestamp: z.iso
    .datetime({ offset: true })
    .describe('When it happened, ISO 8601 (for example "2026-07-28T14:02:00Z").'),
  end_timestamp: z.iso
    .datetime({ offset: true })
    .optional()
    .describe('When it ended, for an event that lasted (an outage window, a rollout).'),
  title: z
    .string()
    .min(1)
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .describe('What happened, in one line (for example "checkout v2.3.1 deployed").'),
  type: timelineEventTypeSchema.describe(
    '"change" (deploy, config, scaling), "symptom" (a signal deviating), "detection" (an alert or event fired), "action" (someone or something intervened), "recovery" (a signal back to normal), or "other".'
  ),
  entity: z
    .string()
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .optional()
    .describe('The service, host, or component the event happened on.'),
  evidence: investigationEvidenceSchema
    .optional()
    .describe(
      'What places the event: a short description, a chart of the signal around it, or both.'
    ),
});

export const setTimelineToolSchema = z.object({
  events: z
    .array(setTimelineEventSchema)
    .max(MAX_TIMELINE_EVENTS)
    .describe('Every event on the timeline so far, not only new ones. Order does not matter.'),
});

export type SetTimelineToolParams = z.infer<typeof setTimelineToolSchema>;

const DESCRIPTION =
  'Record the timeline of the investigation: the events that matter (changes, symptoms, detections, actions, recoveries) on a time axis, each with evidence. ' +
  'This is a snapshot, not a diff: every call must include every event so far and replaces the stored timeline. ' +
  'Call it when an event is established or its evidence improves. It does not end the investigation; keep working after calling it.';

export const REMOVED_TIMELINE_ATTACHMENT_NOTE =
  'The user removed the timeline attachment from this conversation. The timeline was recorded but is not shown in the conversation.';

/** `investigations.set_timeline`: the agent's write path for `investigation_timeline`. */
export const createSetTimelineTool = ({
  getTimelineService,
  resolveUser,
  privileges,
  logger,
}: {
  getTimelineService: () => TimelineService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_TIMELINE_TOOL_ID,
    description: DESCRIPTION,
    schema: setTimelineToolSchema,
    annotations: {
      title: 'Set Investigation Timeline',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async ({ events }, { context, conversationId }) => {
      const user = await resolveUser(context.request);
      const { document, attachment } = await getTimelineService().setFromTool({
        context,
        conversationId,
        events,
        user,
      });

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: document.id,
            ...(attachment === 'removed_by_user' && { warning: REMOVED_TIMELINE_ATTACHMENT_NOTE }),
          }),
        ],
      };
    },
  });
