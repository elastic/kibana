/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import { investigationEvidenceSchema, MAX_EVIDENCE_TEXT_LENGTH } from '../../../common/evidence';
import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_NAME_LENGTH,
  MAX_IMPACT_TOOL_ENTITIES,
  SET_IMPACT_TOOL_ID,
} from '../../../common/impact/constants';
import type { Impact, ImpactEntity } from '../../../common/impact/impact';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import { attachImpactFromTool } from '../attachments/attach_impact_from_tool';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import type { ImpactService } from '../services/impact_service';

const setImpactEntitySchema = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_ENTITY_NAME_LENGTH)
    .describe('Human-readable name: service, host, or component. Prefer service names.'),
  id: z
    .string()
    .min(1)
    .max(MAX_ENTITY_ID_LENGTH)
    .optional()
    .describe('Stable entity id, when you have one. Defaults to the name.'),
  type: z
    .string()
    .min(1)
    .max(MAX_ENTITY_ID_LENGTH)
    .optional()
    .describe('Entity category. Prefer "service"; use "host", "database", etc. otherwise.'),
  feature_id: z
    .string()
    .min(1)
    .max(MAX_ENTITY_ID_LENGTH)
    .optional()
    .describe('Knowledge Indicator feature id, when this entity is backed by one.'),
  stream_name: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
  evidence: investigationEvidenceSchema
    .optional()
    .describe("Evidence of this entity's impact, ideally a chart of its failure signal."),
});

export const setImpactToolSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .nullable()
    .optional()
    .describe(
      'Business-facing account of the impact: what was affected, how badly, for how long, and how broadly (users, requests, regions). Pass null to remove it.'
    ),
  evidence: investigationEvidenceSchema
    .nullable()
    .optional()
    .describe(
      'Evidence backing the summary when you do not report entities, ideally a chart of the user-facing failure signal. Pass null to remove it.'
    ),
  entities: z
    .array(setImpactEntitySchema)
    .max(MAX_IMPACT_TOOL_ENTITIES)
    .optional()
    .describe(
      'Only when two or more entities were affected in different ways, each with its own evidence. Replaces the stored list; pass [] to remove entities.'
    ),
});

export type SetImpactToolParams = z.infer<typeof setImpactToolSchema>;

const DESCRIPTION =
  'Record the impact of the investigated issue on the investigation, so it is shown to the user and kept with the conversation. ' +
  'Each field you pass replaces the stored one; fields you leave out are kept. `entities` replaces the whole list; pass `null` to remove `summary` or `evidence`, and `[]` to remove `entities`. ' +
  'Use one form: a `summary` with one top-level `evidence` for a single service or no specific component, or a `summary` with `entities` when two or more entities were affected in different ways, each with its own evidence. ' +
  'Call it again whenever your understanding of the impact changes. It does not end the investigation.';

export const SINGLE_IMPACT_ENTITY_WARNING =
  'The impact lists a single entity. Use the entity form only when two or more entities were affected in different ways: name the service in "summary", move its chart to "evidence", and pass "entities": []. Send a corrected call before your final output.';

export const BOTH_IMPACT_FORMS_WARNING =
  'The impact has both a top-level "evidence" and "entities". Use one or the other: top-level evidence for a single service or no specific component, entities only when two or more were affected in different ways. Remove the one you do not want with "evidence": null or "entities": []. Send a corrected call before your final output.';

export const REMOVED_IMPACT_ATTACHMENT_NOTE =
  'The user removed the impact attachment from this conversation. The impact was recorded but is not shown in the conversation.';

/** Corrections the agent should make before its final output; empty when the impact is fine. */
export const getImpactWarnings = ({ entities = [], evidence }: Impact): string[] =>
  [
    // Seeded entities carry no evidence yet; only a finalized single entity is a mistake.
    entities.length === 1 && entities[0].evidence !== undefined && SINGLE_IMPACT_ENTITY_WARNING,
    entities.length > 0 && evidence !== undefined && BOTH_IMPACT_FORMS_WARNING,
  ].filter((warning): warning is string => typeof warning === 'string');

const toImpactEntity = ({
  id,
  name,
  type,
  feature_id: featureId,
  stream_name: streamName,
  evidence,
}: NonNullable<SetImpactToolParams['entities']>[number]): ImpactEntity => ({
  id: id ?? name,
  name,
  ...(type !== undefined && { type }),
  ...(featureId !== undefined && { featureId }),
  ...(streamName !== undefined && { streamName }),
  ...(evidence !== undefined && { evidence }),
});

/** `agentic_investigations.set_impact`: the agent's write path for the `investigation_impact` attachment. */
export const createSetImpactTool = ({
  getImpactService,
  resolveUser,
  privileges,
  logger,
}: {
  getImpactService: () => ImpactService;
  resolveUser: ResolveUser;
  privileges: ImpactPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_IMPACT_TOOL_ID,
    description: DESCRIPTION,
    schema: setImpactToolSchema,
    annotations: {
      title: 'Set Investigation Impact',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async ({ summary, evidence, entities }, { context, conversationId }) => {
      if (summary === undefined && evidence === undefined && entities === undefined) {
        return {
          results: [
            createErrorResult('Pass at least one of "summary", "evidence", or "entities".'),
          ],
        };
      }

      const { spaceId, request } = context;
      const service = getImpactService();
      const user = await resolveUser(request);
      const { impact, attachment } = await attachImpactFromTool({
        context,
        readImpact: () => service.findByConversationId(conversationId, spaceId),
        writeImpact: () =>
          service.set(
            { conversationId, summary, evidence, entities: entities?.map(toImpactEntity) },
            { spaceId, user }
          ),
        revertImpact: (written) => service.revertAttach(written),
      });

      const notes = [
        ...getImpactWarnings(impact),
        ...(attachment === 'removed_by_user' ? [REMOVED_IMPACT_ATTACHMENT_NOTE] : []),
      ];

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: impact.id,
            ...(notes.length > 0 && { warning: notes.join(' ') }),
          }),
        ],
      };
    },
  });
