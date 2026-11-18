/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  MergeAttachmentsRequest,
  MergeCasesPreviewRequest,
  MergeCasesPreviewResponse,
  MergeConflict,
  MergeLimit,
} from '../../../common/types/api';
import type { MergeCasesStepOutput } from '../../../common/workflows/steps/merge_cases';
import { mergeCasesStepCommonDefinition } from '../../../common/workflows/steps/merge_cases';
import { MergeFieldsRequestSchema } from '../../../common/types/api/merge/v1';
import { CaseStatuses } from '../../../common/types/domain';
import type { CasesClient } from '../../client';
import { mergeCasesStepDefinition } from '../../workflows/steps/merge_cases';
import { invokeStepHandler } from '../utils/invoke_step';
import { confirmMerge } from '../utils/confirm_merge';
import {
  CASES_SOLUTION_CONTEXT_INSTRUCTION,
  CASES_TOOL_TEXT_INSTRUCTION,
} from '../utils/tool_instructions';
import {
  emitCaseAttachment,
  injectAttachmentIds,
  toCaseAttachmentData,
} from '../attachments/emit_attachments';
import {
  CASES_UPDATED_UI_EVENT,
  type CasesUpdatedUiEventData,
} from '../../../common/types/agent_builder/ui_events';
import * as i18n from './merge_cases_translations';

type GetCasesClientFn = (request: KibanaRequest) => Promise<CasesClient>;

export const mergeCasesToolSchema = lazySchema(() => {
  const { shape: stepInputShape } = mergeCasesStepCommonDefinition.inputSchema;
  return z.object({
    case_ids: stepInputShape.case_ids,
    destination_case_id: stepInputShape.destination_case_id,
    fields: MergeFieldsRequestSchema.optional().describe(
      'Values for the destination, only those the user asked for or chose. Every field the cases hold different values for must have a value chosen by the user; the tool lists them when they are missing.'
    ),
    close_sources: z
      .boolean()
      .optional()
      .describe('Close the source cases that are open or in progress. Defaults to true.'),
    note: stepInputShape.note,
    keep_newest_over_limit: z
      .boolean()
      .optional()
      .describe(
        'When a kind of attachment is over its destination limit, keep the newest items up to the limit and leave the rest on the source cases. Only set it after the user agreed.'
      ),
  });
});

type MergeCasesToolParams = z.infer<typeof mergeCasesToolSchema>;

const NEWEST_UP_TO_LIMIT: MergeAttachmentsRequest = {
  alerts: { mode: 'newest' },
  observables: { mode: 'newest' },
  other: { mode: 'newest' },
};

const MAX_VALUE_LENGTH = 200;

type DisplayValue = string | number | boolean | null | { name: string };

const formatValue = (value: DisplayValue): string => {
  if (value == null) {
    return 'none';
  }
  if (typeof value === 'object') {
    return `"${value.name}"`;
  }
  const text = String(value);
  return JSON.stringify(
    text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text
  );
};

const getCaseRef = (preview: MergeCasesPreviewResponse, caseId: string): string => {
  const theCase = preview.cases.find(({ id }) => id === caseId);
  if (theCase == null) {
    return caseId;
  }
  return theCase.incrementalId != null ? `#${theCase.incrementalId}` : `"${theCase.title}"`;
};

const getConflictRow = (
  { fields }: MergeCasesPreviewResponse,
  { field, key }: MergeConflict
):
  | { value: DisplayValue; options: Array<{ value: DisplayValue; caseIds: string[] }> }
  | undefined => {
  switch (field) {
    case 'customFields':
      return fields.customFields.find((row) => row.key === key);
    case 'extendedFields':
      return fields.extendedFields.find((row) => row.key === key);
    case 'connector':
      return fields.connector;
    case 'template':
      return fields.template;
    default:
      return fields[field];
  }
};

const describeConflict = (preview: MergeCasesPreviewResponse, conflict: MergeConflict): string => {
  const path = conflict.key != null ? `${conflict.field}.${conflict.key}` : conflict.field;
  const name = conflict.label != null ? `${path} (${conflict.label})` : path;

  if (conflict.reason === 'required') {
    return `- ${name}: the destination template requires a value.`;
  }
  if (conflict.reason === 'invalidValue') {
    return `- ${name}: the value is not valid for the destination template${
      conflict.message ? ` (${conflict.message})` : ''
    }; choose another value or clear it.`;
  }

  const row = getConflictRow(preview, conflict);
  if (row == null) {
    return `- ${name}: the cases hold different values.`;
  }
  const options = row.options
    .map(
      ({ value, caseIds }) =>
        `${formatValue(value)} (${caseIds.map((id) => getCaseRef(preview, id)).join(', ')})`
    )
    .join('; ');
  return `- ${name}: ${options}. Suggested: ${formatValue(row.value)}.`;
};

const describeLimit = ({ kind, total, max, overBy }: MergeLimit): string =>
  `- ${kind}: ${total} is over the limit of ${max}; ${overBy} must stay on the source cases.`;

const getBlockedMessage = (preview: MergeCasesPreviewResponse): string => {
  const unresolved = preview.conflicts.filter(({ resolved }) => !resolved);
  const lines = ['The cases were not merged and nothing changed.'];
  if (unresolved.length > 0) {
    lines.push(
      'The cases hold different values for these fields. Ask the user to choose a value for each one (for example with a question listing the options), never choose yourself, then call this tool again with the chosen values in `fields`:',
      ...unresolved.map((conflict) => describeConflict(preview, conflict))
    );
  }
  if (preview.limits.length > 0) {
    lines.push(
      'The merge would go over destination limits. Ask the user whether to keep the newest items up to each limit; if they agree, call again with `keep_newest_over_limit: true`:',
      ...preview.limits.map(describeLimit)
    );
  }
  return lines.join('\n');
};

const formatCounts = (counts: Array<[string, number]>): string =>
  counts
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => i18n.ITEM_COUNTS[kind](count))
    .join(', ');

/** The markdown summary the user confirms: the cases, the destination, what is copied and closed. */
export const buildMergeSummary = (
  preview: MergeCasesPreviewResponse,
  { fields, close_sources: closeSources = true }: MergeCasesToolParams
): string => {
  const { cases, destination, attachments } = preview;
  const caseRefs = cases.map(({ id }) => getCaseRef(preview, id));
  const sources = cases.filter(({ id }) => id !== destination.id);
  const kinds = ['alerts', 'events', 'attacks', 'observables', 'other'] as const;

  const copies = formatCounts(kinds.map((kind) => [kind, attachments[kind].toCopy]));
  const leftOut = formatCounts([
    ...kinds.map((kind): [string, number] => [
      kind,
      attachments[kind].leftOut +
        attachments[kind].notCopied.reduce((sum, { count }) => sum + count, 0),
    ]),
    ['files', attachments.files.total],
    ['comments', attachments.comments.total],
  ]);
  const toClose = closeSources
    ? sources.filter(({ status }) => status !== CaseStatuses.closed).map(({ id }) => id)
    : [];

  return [
    i18n.CONFIRM_CASES(caseRefs.join(', ')),
    destination.isNew || destination.id == null
      ? i18n.CONFIRM_INTO_NEW_CASE(fields?.title ?? preview.fields.title.value)
      : i18n.CONFIRM_INTO_EXISTING_CASE(getCaseRef(preview, destination.id)),
    copies.length > 0 ? i18n.CONFIRM_COPIES(copies) : i18n.CONFIRM_NOTHING_TO_COPY,
    ...(leftOut.length > 0 ? [i18n.CONFIRM_LEFT_OUT(leftOut)] : []),
    toClose.length > 0
      ? i18n.CONFIRM_CLOSES(toClose.map((id) => getCaseRef(preview, id)).join(', '))
      : i18n.CONFIRM_CLOSES_NONE,
  ].join('\n\n');
};

const toPreviewRequest = ({
  case_ids: caseIds,
  destination_case_id: destinationCaseId,
  fields,
  keep_newest_over_limit: keepNewest,
}: MergeCasesToolParams): MergeCasesPreviewRequest => ({
  caseIds,
  ...(destinationCaseId != null ? { destinationCaseId } : {}),
  ...(fields != null ? { fields } : {}),
  ...(keepNewest === true ? { attachments: NEWEST_UP_TO_LIMIT } : {}),
});

const emitMergeResult = async (
  toolContext: ToolHandlerContext,
  casesClient: CasesClient,
  output: MergeCasesStepOutput
): Promise<string[]> => {
  const { attachments, events } = toolContext;
  events.sendUiEvent<typeof CASES_UPDATED_UI_EVENT, CasesUpdatedUiEventData>(
    CASES_UPDATED_UI_EVENT,
    { caseIds: [output.destination.id, ...output.sources.map(({ caseId }) => caseId)] }
  );
  const destinationCase = await casesClient.cases.get({ id: output.destination.id });
  return [await emitCaseAttachment(attachments, toCaseAttachmentData(destinationCase))];
};

export const mergeCasesTool = (
  getCasesClientFn: GetCasesClientFn
): BuiltinToolDefinition<typeof mergeCasesToolSchema> => {
  const mergeStepDef = mergeCasesStepDefinition(getCasesClientFn);

  return {
    id: platformCoreCasesTools.merge,
    type: ToolType.builtin,
    description: `Merge 2 to 10 cases of one solution into a new case or into one of them that is not closed. Copies their alerts, events, observables and other attachments into the destination, skipping duplicates; the source cases keep everything, link to the destination and close unless close_sources is false. Previews first: when the cases hold different values for a field, or a kind of attachment is over its limit, nothing is merged and the result lists what the user must decide. The user is asked to confirm every merge.\n\n${CASES_SOLUTION_CONTEXT_INSTRUCTION}${CASES_TOOL_TEXT_INSTRUCTION}`,
    annotations: {
      title: 'Merge Cases',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: mergeCasesToolSchema,
    tags: ['cases'],
    excludeFromMcp: true,
    handler: async (params, toolContext) => {
      const { logger, request } = toolContext;
      try {
        const casesClient = await getCasesClientFn(request);
        const previewRequest = toPreviewRequest(params);
        const preview = await casesClient.cases.mergePreview(previewRequest);

        if (!preview.canMerge) {
          return { results: [createErrorResult(getBlockedMessage(preview))] };
        }

        const summary = buildMergeSummary(preview, params);
        const confirmation = confirmMerge({
          context: toolContext,
          promptContent: JSON.stringify({ previewRequest, summary }),
          prompt: {
            title: i18n.CONFIRM_TITLE(preview.cases.length),
            message: summary,
            confirm_text: i18n.CONFIRM_TEXT,
            cancel_text: i18n.CANCEL_TEXT,
            color: 'warning',
          },
          declinedMessage: 'The user declined the merge, so the cases were not merged.',
        });
        if (confirmation != null) {
          return confirmation;
        }

        const result = await invokeStepHandler(
          mergeStepDef,
          {
            case_ids: params.case_ids,
            ...(params.destination_case_id != null
              ? { destination_case_id: params.destination_case_id }
              : {}),
            ...(params.fields != null ? { fields: params.fields } : {}),
            ...(previewRequest.attachments != null
              ? { attachments: previewRequest.attachments }
              : {}),
            close_sources: params.close_sources ?? true,
            ...(params.note != null ? { note: params.note } : {}),
          },
          toolContext
        );

        const output = result.results[0]?.data as MergeCasesStepOutput;
        const attachmentIds = await emitMergeResult(toolContext, casesClient, output);
        return injectAttachmentIds(result, attachmentIds);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[Cases Tool] Failed to merge cases: ${message}`);
        return { results: [createErrorResult(`Failed to merge cases: ${message}`)] };
      }
    },
  };
};
