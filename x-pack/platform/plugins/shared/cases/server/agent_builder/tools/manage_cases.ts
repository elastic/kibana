/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { createCaseStepCommonDefinition } from '../../../common/workflows/steps/create_case';
import { updateCaseStepCommonDefinition } from '../../../common/workflows/steps/update_case';
import { updateCasesStepCommonDefinition } from '../../../common/workflows/steps/update_cases';
import { deleteCasesStepCommonDefinition } from '../../../common/workflows/steps/delete_cases';
import { createCaseFromTemplateStepCommonDefinition } from '../../../common/workflows/steps/create_case_from_template';
import { assignCaseStepCommonDefinition } from '../../../common/workflows/steps/assign_case';
import { addTagsStepCommonDefinition } from '../../../common/workflows/steps/add_tags';
import { setCustomFieldStepCommonDefinition } from '../../../common/workflows/steps/set_custom_field';
import { setExtendedFieldsStepCommonDefinition } from '../../../common/workflows/steps/set_extended_fields';
import { createCaseStepDefinition } from '../../workflows/steps/create_case';
import { updateCaseStepDefinition } from '../../workflows/steps/update_case';
import { updateCasesStepDefinition } from '../../workflows/steps/update_cases';
import { deleteCasesStepDefinition } from '../../workflows/steps/delete_cases';
import { createCaseFromTemplateStepDefinition } from '../../workflows/steps/create_case_from_template';
import { assignCaseStepDefinition } from '../../workflows/steps/simple_steps';
import { unassignCaseStepDefinition } from '../../workflows/steps/unassign_case';
import { addTagsStepDefinition } from '../../workflows/steps/add_tags';
import { setCustomFieldStepDefinition } from '../../workflows/steps/set_custom_field';
import { setExtendedFieldsStepDefinition } from '../../workflows/steps/set_extended_fields';
import type { CasesClient } from '../../client';
import { invokeStepHandler } from '../utils/invoke_step';
import {
  CASES_TOOL_TEXT_INSTRUCTION,
  CASES_SOLUTION_CONTEXT_INSTRUCTION,
} from '../utils/tool_instructions';
import { emitFromStepResult, injectAttachmentIds } from '../attachments/emit_attachments';
import { LINKED_INVESTIGATION_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { CaseAccessMode, CaseStatuses } from '../../../common/types/domain';
import { getEffectiveStatuses } from '../../../common/utils/statuses';
import {
  getAgentCasesClient,
  toolResult,
  type GetCasesClientWithOptionsFn,
} from '../utils/agent_cases_client';

const CONFIRM_TOOL = platformCoreCasesTools.confirmedActions;

/**
 * Changes that need the user's confirmation go through the confirmed actions tool, where Agent
 * Builder asks first. This returns why a manage call is refused, or undefined when it may run.
 */
/** Whether a status key lands the case in the closed category (custom closed statuses included). */
export const isClosedStatusKey = async (
  client: CasesClient,
  owner: string,
  statusKey: string
): Promise<boolean> => {
  const [configuration] = await client.configure.get({ owner });
  const target = getEffectiveStatuses(configuration?.statuses).find(({ key }) => key === statusKey);
  return target ? target.category === CaseStatuses.closed : statusKey === CaseStatuses.closed;
};

export const getConfirmationRequiredReason = async (
  client: CasesClient,
  mode: string,
  args: {
    case_id?: string;
    updates?: Record<string, unknown>;
    cases?: Array<{ case_id?: string; updates?: Record<string, unknown> }>;
    settings?: Record<string, unknown>;
  }
): Promise<string | undefined> => {
  if (mode === 'create' && (args.settings as { externalSync?: unknown } | undefined)?.externalSync) {
    return `Turning on sync sends the case outside Elastic and needs the user's confirmation. Create the case without externalSync, then use ${CONFIRM_TOOL} with action sync or push.`;
  }
  const changes =
    mode === 'update'
      ? [{ caseId: args.case_id, updates: args.updates ?? {} }]
      : mode === 'update_bulk'
      ? (args.cases ?? []).map((c) => ({ caseId: c.case_id, updates: c.updates ?? {} }))
      : [];
  const assigneeCaseIds: string[] =
    mode === 'assign' || mode === 'unassign' ? (args.case_id ? [args.case_id] : []) : [];

  for (const { caseId, updates } of changes) {
    if (updates.status === CaseStatuses.closed) {
      return `Closing a case needs the user's confirmation. Use ${CONFIRM_TOOL} with action close.`;
    }
    if (updates.access !== undefined) {
      return `Changing who can see a case needs the user's confirmation. Use ${CONFIRM_TOOL} with action set_visibility.`;
    }
    if ((updates.settings as { externalSync?: unknown } | undefined)?.externalSync !== undefined) {
      return `Changing a case's sync settings can send it outside Elastic and needs the user's confirmation. Use ${CONFIRM_TOOL} with action sync or push.`;
    }
    const needsCase =
      typeof updates.status_key === 'string' ||
      updates.connector !== undefined ||
      updates.assignees !== undefined;
    if (needsCase && caseId) {
      const theCase = await client.cases.get({ id: caseId, includeComments: false });
      if (
        typeof updates.status_key === 'string' &&
        (await isClosedStatusKey(client, theCase.owner, updates.status_key))
      ) {
        return `Closing a case needs the user's confirmation. Use ${CONFIRM_TOOL} with action close and status_key ${updates.status_key}.`;
      }
      if (updates.connector !== undefined && theCase.settings?.externalSync?.autoPush) {
        return `Case ${caseId} pushes automatically, so changing its connector sends it outside Elastic. Ask the user, then use ${CONFIRM_TOOL} with action push.`;
      }
      if (updates.assignees !== undefined) assigneeCaseIds.push(caseId);
    }
  }

  for (const caseId of assigneeCaseIds) {
    const theCase = await client.cases.get({ id: caseId, includeComments: false });
    if (theCase.access?.mode === CaseAccessMode.RESTRICTED) {
      return `Case ${caseId} is restricted, so its assignees decide who can see it. Use ${CONFIRM_TOOL} with action change_assignees.`;
    }
  }
  return undefined;
};

const BASE_MODES = [
  'create',
  'create_from_template',
  'update',
  'update_bulk',
  'delete',
  'assign',
  'unassign',
  'add_tags',
  'set_custom_field',
] as const;

/** Modes for agentic cases (`xpack.cases.agentic.enabled`); absent otherwise, as on main. */
const AGENTIC_MODES = [
  'set_status',
  'link_cases',
  'unlink_case',
  'link_investigation',
  'unlink_investigation',
] as const;

const EXTENDED_FIELDS_MODE = 'set_extended_fields' as const;

type ManageMode =
  | (typeof BASE_MODES)[number]
  | (typeof AGENTIC_MODES)[number]
  | typeof EXTENDED_FIELDS_MODE;

const BASE_MODE_DESCRIPTION =
  'Required fields per mode:\n' +
  '- create: title, owner (+ optional connector_id)\n' +
  '- create_from_template: owner, case_template_id\n' +
  '- update: case_id, updates (version auto-resolved)\n' +
  '- update_bulk: cases (array of {case_id, updates, version?}) — use for ≥2 cases\n' +
  '- delete: case_ids\n' +
  '- assign: case_id, assignees (ADDS users)\n' +
  '- unassign: case_id, assignees (REMOVES users; null/[] removes all)\n' +
  '- add_tags: case_id, tags_to_add (APPENDS to existing tags)\n' +
  '- set_custom_field: case_id, owner, field_name, value\n';

const RESTRICTED_DESCRIPTION =
  '\nA case with `access.mode: "restricted"` is visible only to its assignees ' +
  '(the actor is auto-assigned on restrict). Create or update may set ' +
  '`access` to restrict or unrestrict a case; restricted cases do not appear ' +
  'in search results for non-assignees.';

const AGENTIC_MODE_DESCRIPTION =
  '- set_status: case_id, status_key (a status the case can move to; read them with platform.core.cases mode status). Statuses that pause time tracking pause it.\n' +
  '- link_cases: case_id, target_case_ids. Links cases both ways (a reference; nothing is merged or copied).\n' +
  '- unlink_case: case_id, target_case_id.\n' +
  '- link_investigation: case_id, investigation_id. Links an AlertZero investigation; it links back to the case.\n' +
  '- unlink_investigation: case_id, investigation_id.\n';

const AGENTIC_RESTRICTED_DESCRIPTION =
  `\nA case with \`access.mode: "restricted"\` is visible only to its assignees. A new case may be ` +
  `created restricted. Closing a case, restricting or unrestricting it, and changing the assignees ` +
  `of a restricted case need the user's confirmation: use ${CONFIRM_TOOL}, never update, assign, or set_status. Restricted cases never appear for people who are not assignees.`;

const EXTENDED_FIELDS_MODE_DESCRIPTION =
  '- set_extended_fields: case_id, fields (map of `<name>_as_<type>` → value)\n';

const AGENTIC_FIELDS = {
  status_key: z.string().max(50).optional().describe('The status to move to. set_status mode.'),
  pause_reason: z
    .string()
    .max(50)
    .optional()
    .describe(
      'set_status mode: required when the status pauses time tracking; one of the pause reasons platform.core.cases mode status returns.'
    ),
  target_case_ids: z.array(z.string()).max(20).optional().describe('link_cases mode.'),
  target_case_id: z.string().optional().describe('unlink_case mode.'),
  investigation_id: z
    .string()
    .optional()
    .describe('link_investigation and unlink_investigation modes.'),
};

const buildManageCasesSchema = (isTemplatesEnabled: boolean, isAgenticEnabled: boolean) => {
  const modes = [
    ...BASE_MODES,
    ...(isAgenticEnabled ? AGENTIC_MODES : []),
    ...(isTemplatesEnabled ? [EXTENDED_FIELDS_MODE] : []),
  ] as [ManageMode, ...ManageMode[]];

  const modeDescription =
    BASE_MODE_DESCRIPTION +
    (isAgenticEnabled ? AGENTIC_MODE_DESCRIPTION : '') +
    (isTemplatesEnabled ? EXTENDED_FIELDS_MODE_DESCRIPTION : '') +
    (isAgenticEnabled ? AGENTIC_RESTRICTED_DESCRIPTION : RESTRICTED_DESCRIPTION);

  return z.object({
    mode: z.enum(modes).describe(modeDescription),
    ...createCaseStepCommonDefinition.inputSchema.partial().shape,
    ...updateCaseStepCommonDefinition.inputSchema.partial().shape,
    ...updateCasesStepCommonDefinition.inputSchema.partial().shape,
    ...deleteCasesStepCommonDefinition.inputSchema.partial().shape,
    ...createCaseFromTemplateStepCommonDefinition.inputSchema.partial().shape,
    ...assignCaseStepCommonDefinition.inputSchema.partial().shape,
    ...setCustomFieldStepCommonDefinition.inputSchema.partial().shape,
    ...(isTemplatesEnabled
      ? setExtendedFieldsStepCommonDefinition.inputSchema.partial().shape
      : {}),
    // add_tags: only adds tags + case_id — both already covered; provide alias to avoid conflict with create's tags:
    tags_to_add: addTagsStepCommonDefinition.inputSchema.shape.tags
      .optional()
      .describe('Tags to ADD to the existing tag list. Required for add_tags mode.'),
    // Custom field not in any step schema:
    connector_id: z
      .string()
      .optional()
      .describe('External connector ID for the case. Optional for create mode.'),
    // Override tags to clarify it replaces the full tag list (vs tags_to_add which appends):
    tags: createCaseStepCommonDefinition.inputSchema.shape.tags.describe(
      'Tags to set on the case. Used in create mode (replaces entire tag list).'
    ),
    // Present at runtime only with agentic cases on, so main's schema is unchanged when off.
    ...((isAgenticEnabled ? AGENTIC_FIELDS : {}) as typeof AGENTIC_FIELDS),
  });
};

type ManageCasesSchema = ReturnType<typeof buildManageCasesSchema>;

export const manageCasesTool = (
  getCasesClientFn: GetCasesClientWithOptionsFn,
  isTemplatesEnabled: boolean,
  isAgenticEnabled = false
): BuiltinToolDefinition<ManageCasesSchema> => {
  const manageCasesSchema = buildManageCasesSchema(isTemplatesEnabled, isAgenticEnabled);
  const createStepDef = createCaseStepDefinition(getCasesClientFn);
  const updateCaseStepDef = updateCaseStepDefinition(getCasesClientFn);
  const updateCasesStepDef = updateCasesStepDefinition(getCasesClientFn);
  const deleteCasesStepDef = deleteCasesStepDefinition(getCasesClientFn);
  const createFromTemplateStepDef = createCaseFromTemplateStepDefinition(
    getCasesClientFn,
    isTemplatesEnabled
  );
  const assignStepDef = assignCaseStepDefinition(getCasesClientFn);
  const unassignStepDef = unassignCaseStepDefinition(getCasesClientFn);
  const addTagsStepDef = addTagsStepDefinition(getCasesClientFn);
  const setCustomFieldStepDef = setCustomFieldStepDefinition(getCasesClientFn);
  // Always constructed (cheap, no side effects): whether `set_extended_fields` is actually
  // reachable is gated by `isTemplatesEnabled` in the schema (`buildManageCasesSchema`), not here.
  const setExtendedFieldsStepDef = setExtendedFieldsStepDefinition(getCasesClientFn);

  const modesDescription = isTemplatesEnabled
    ? '`create`, `create_from_template`, `update`, `update_bulk` (≥2 cases), `delete`, `assign`, `unassign`, `add_tags`, `set_custom_field`, `set_extended_fields`'
    : '`create`, `create_from_template`, `update`, `update_bulk` (≥2 cases), `delete`, `assign`, `unassign`, `add_tags`, `set_custom_field`';

  return {
    id: platformCoreCasesTools.manage,
    type: ToolType.builtin,
    description: `Cases CRUD + assign/tags/custom fields${
      isTemplatesEnabled ? '/extended fields' : ''
    }. Modes: ${modesDescription}. See \`mode\` field for required inputs.\n\n${CASES_SOLUTION_CONTEXT_INSTRUCTION}${CASES_TOOL_TEXT_INSTRUCTION}`,
    annotations: {
      title: 'Manage Cases',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: manageCasesSchema,
    tags: ['cases'],
    excludeFromMcp: true,
    handler: async (args, toolContext) => {
      const {
        mode,
        connector_id,
        tags_to_add,
        case_id,
        assignees,
        status_key,
        pause_reason,
        target_case_ids,
        target_case_id,
        investigation_id,
        ...rest
      } = args;

      const agentClient = await getAgentCasesClient(getCasesClientFn, toolContext);
      // With agentic cases off there is no confirmation tool, so main's behavior stands.
      const refusal = isAgenticEnabled
        ? await getConfirmationRequiredReason(agentClient, mode, {
            case_id,
            updates: (rest as { updates?: Record<string, unknown> }).updates,
            cases: (
              rest as { cases?: Array<{ case_id?: string; updates?: Record<string, unknown> }> }
            ).cases,
            settings: (rest as { settings?: Record<string, unknown> }).settings,
          })
        : undefined;
      if (refusal) {
        throw new Error(refusal);
      }

      const requireCaseId = () => {
        if (!case_id) throw new Error(`case_id is required for ${mode}`);
        return case_id;
      };

      switch (mode) {
        case 'set_status': {
          if (!status_key) throw new Error('status_key is required for set_status');
          const theCase = await agentClient.cases.get({ id: requireCaseId(), includeComments: false });
          if (await isClosedStatusKey(agentClient, theCase.owner, status_key)) {
            throw new Error(
              `Closing a case needs the user's confirmation. Use ${CONFIRM_TOOL} with action close and status_key ${status_key}.`
            );
          }
          const [updated] = await agentClient.cases.bulkUpdate({
            cases: [
              {
                id: theCase.id,
                version: theCase.version,
                status_key,
                ...(pause_reason ? { pause_reason } : {}),
              },
            ],
          });
          return toolResult({
            case_id: updated.id,
            status: updated.status,
            status_key: updated.status_key ?? null,
            paused_at: updated.paused_at ?? null,
          });
        }
        case 'link_cases':
          if (!target_case_ids?.length)
            throw new Error('target_case_ids is required for link_cases');
          return toolResult(
            await agentClient.cases.linkCases(requireCaseId(), { target_case_ids })
          );
        case 'unlink_case':
          if (!target_case_id) throw new Error('target_case_id is required for unlink_case');
          return toolResult(await agentClient.cases.unlinkCase(requireCaseId(), target_case_id));
        case 'link_investigation': {
          if (!investigation_id)
            throw new Error('investigation_id is required for link_investigation');
          const theCase = await agentClient.cases.get({
            id: requireCaseId(),
            includeComments: false,
          });
          const created = await agentClient.attachments.bulkCreate({
            caseId: theCase.id,
            attachments: [
              {
                type: LINKED_INVESTIGATION_ATTACHMENT_TYPE,
                owner: theCase.owner,
                attachmentId: investigation_id,
              },
            ],
          });
          return toolResult({ case_id: theCase.id, linked: created.map(({ id }) => id) });
        }
        case 'unlink_investigation': {
          if (!investigation_id)
            throw new Error('investigation_id is required for unlink_investigation');
          // Read the case first so a restricted case the user can't see is simply not found.
          const caseId = (
            await agentClient.cases.get({ id: requireCaseId(), includeComments: false })
          ).id;
          const found = await agentClient.attachments.find({
            caseID: caseId,
            findQueryParams: { type: LINKED_INVESTIGATION_ATTACHMENT_TYPE, perPage: 100 },
          });
          const links = found.data.filter(
            (attachment) =>
              'attachmentId' in attachment && attachment.attachmentId === investigation_id
          );
          if (links.length === 0) {
            throw new Error(`Investigation ${investigation_id} is not linked to case ${caseId}`);
          }
          for (const link of links) {
            await agentClient.attachments.delete({ caseID: caseId, savedObjectId: link.id });
          }
          return toolResult({ case_id: caseId, unlinked: investigation_id });
        }
        default:
          break;
      }

      const runStep = async () => {
        switch (mode) {
          case 'create': {
            const input: Record<string, unknown> = { ...rest };
            if (case_id !== undefined) input.case_id = case_id;
            if (assignees !== undefined) input.assignees = assignees;
            const config: Record<string, unknown> = {};
            if (connector_id) config['connector-id'] = connector_id;
            return invokeStepHandler(createStepDef, input, toolContext, config);
          }
          case 'create_from_template':
            return invokeStepHandler(createFromTemplateStepDef, { ...rest }, toolContext);
          case 'update':
            return invokeStepHandler(updateCaseStepDef, { case_id, ...rest }, toolContext);
          case 'update_bulk':
            return invokeStepHandler(updateCasesStepDef, { ...rest }, toolContext);
          case 'delete':
            return invokeStepHandler(deleteCasesStepDef, { ...rest }, toolContext);
          case 'assign':
            return invokeStepHandler(assignStepDef, { case_id, assignees, ...rest }, toolContext);
          case 'unassign':
            return invokeStepHandler(unassignStepDef, { case_id, assignees, ...rest }, toolContext);
          case 'add_tags':
            return invokeStepHandler(
              addTagsStepDef,
              { case_id, tags: tags_to_add, ...rest },
              toolContext
            );
          case 'set_custom_field':
            return invokeStepHandler(setCustomFieldStepDef, { case_id, ...rest }, toolContext);
          case EXTENDED_FIELDS_MODE:
            // Reaching this case requires the `manageCasesSchema` to have accepted `mode:
            // 'set_extended_fields'`, which only happens when `isTemplatesEnabled` is true (see
            // `buildManageCasesSchema`) — so `setExtendedFieldsStepDef` is always usable here.
            return invokeStepHandler(setExtendedFieldsStepDef, { case_id, ...rest }, toolContext);
          default:
            throw new Error(`Unknown manage_cases mode: ${mode}`);
        }
      };

      const result = await runStep();
      if (mode !== 'delete') {
        const attachmentIds = await emitFromStepResult(toolContext, result);
        return injectAttachmentIds(result, attachmentIds);
      }
      return result;
    },
  };
};
