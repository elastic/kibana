/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchQuery, HttpStart } from '@kbn/core/public';
import {
  INVESTIGATIONS_CAPABILITIES_URL,
  INVESTIGATIONS_DUPLICATES_URL,
  INVESTIGATIONS_FIND_URL,
  INVESTIGATIONS_INDICATOR_LOOKUP_URL,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_PROCEDURE_TEMPLATES_URL,
  INVESTIGATIONS_STATUSES_URL,
  INVESTIGATIONS_TYPES_URL,
  getRecordActivityUrl,
  getRecordItemUrl,
  getRecordItemsUrl,
  getRecordUrl,
} from '../../../common/investigations/constants';
import type {
  ActivityEntry,
  AddCommentRequest,
  BulkCreateItemsRequest,
  BulkCreateItemsResponse,
  BulkDeleteItemsRequest,
  BulkUpdateItemsRequest,
  BulkUpdateItemsResponse,
  CapabilitiesResponse,
  ChangeHistoryResponse,
  CloseRecordRequest,
  CreateActivityRequest,
  CreateRecordRequest,
  CreateRecordResponse,
  CreateThreadRequest,
  DuplicateCheckRequest,
  ExportItemsRequest,
  ExternalTicketResponse,
  FindActivityRequest,
  FindActivityResponse,
  FindCommentsRequest,
  FindCommentsResponse,
  FindItemsRequest,
  FindItemsResponse,
  FindRecordsRequest,
  FindRecordsResponse,
  GetRecordResponse,
  ImportIndicatorsRequest,
  ImportIndicatorsResponse,
  IndicatorLookupResponse,
  InvestigationItem,
  InvestigationRecord,
  InvestigationTimings,
  InvestigationType,
  LinkRecordResponse,
  MergeRecordRequest,
  MergeRecordResponse,
  ProcedureTemplate,
  ProcedureTemplateTask,
  RecordComment,
  RelatedRecord,
  RelatedRecordsResponse,
  ReorderTasksRequest,
  ReportResponse,
  RunTaskWorkflowResponse,
  SinceLastHandoffResponse,
  TaskItem,
  ThreadRef,
  UpdateCommentRequest,
  UpdateExternalTicketRequest,
  UpdateItemRequest,
  UpdateRecordRequest,
} from '../../../common/investigations/types';
import type { StatusesConfiguration } from '../../../common/investigations/statuses';

/**
 * Flattens a request object into an HTTP query. Arrays are sent as repeated parameters and
 * undefined, null and empty arrays are dropped.
 */
export const toQuery = (request: object): HttpFetchQuery => {
  const query: HttpFetchQuery = {};
  Object.entries(request).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) {
        query[key] = value.map((entry) => String(entry));
      }
      return;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      query[key] = value;
    }
  });
  return query;
};

const recordPath = (recordId: string, suffix: string): string =>
  `${getRecordUrl(recordId)}${suffix}`;
const itemsPath = (recordId: string, suffix: string): string =>
  `${getRecordItemsUrl(recordId)}${suffix}`;

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export const createRecord = (http: HttpStart, body: CreateRecordRequest) =>
  http.fetch<CreateRecordResponse>(INVESTIGATIONS_INTERNAL_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const findRecords = (http: HttpStart, request: FindRecordsRequest) =>
  http.fetch<FindRecordsResponse>(INVESTIGATIONS_FIND_URL, {
    method: 'GET',
    query: toQuery(request),
  });

export const checkDuplicates = (http: HttpStart, body: DuplicateCheckRequest) =>
  http.fetch<{ related: RelatedRecord[] }>(INVESTIGATIONS_DUPLICATES_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const lookupIndicators = (http: HttpStart, values: string[]) =>
  http.fetch<IndicatorLookupResponse>(INVESTIGATIONS_INDICATOR_LOOKUP_URL, {
    method: 'GET',
    query: toQuery({ values }),
  });

export const getInvestigationTypes = (http: HttpStart) =>
  http.fetch<{ types: InvestigationType[] }>(INVESTIGATIONS_TYPES_URL, { method: 'GET' });

export const getProcedureTemplates = (http: HttpStart) =>
  http.fetch<{ templates: ProcedureTemplate[] }>(INVESTIGATIONS_PROCEDURE_TEMPLATES_URL, {
    method: 'GET',
  });

export const getCapabilities = (http: HttpStart) =>
  http.fetch<CapabilitiesResponse>(INVESTIGATIONS_CAPABILITIES_URL, { method: 'GET' });

export const getRecord = (http: HttpStart, recordId: string) =>
  http.fetch<GetRecordResponse>(getRecordUrl(recordId), { method: 'GET' });

export const updateRecord = (http: HttpStart, recordId: string, body: UpdateRecordRequest) =>
  http.fetch<{ record: InvestigationRecord }>(getRecordUrl(recordId), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const closeRecord = (http: HttpStart, recordId: string, body: CloseRecordRequest) =>
  http.fetch<{ record: InvestigationRecord }>(recordPath(recordId, '/_close'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const reopenRecord = (http: HttpStart, recordId: string) =>
  http.fetch<{ record: InvestigationRecord }>(recordPath(recordId, '/_reopen'), {
    method: 'POST',
  });

export const mergeRecord = (http: HttpStart, recordId: string, body: MergeRecordRequest) =>
  http.fetch<MergeRecordResponse>(recordPath(recordId, '/_merge'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getRelatedRecords = (http: HttpStart, recordId: string) =>
  http.fetch<RelatedRecordsResponse>(recordPath(recordId, '/_related'), { method: 'GET' });

export const getSinceLastHandoff = (http: HttpStart, recordId: string, since?: string) =>
  http.fetch<SinceLastHandoffResponse>(recordPath(recordId, '/_since'), {
    method: 'GET',
    query: toQuery({ since }),
  });

export const getReport = (http: HttpStart, recordId: string) =>
  http.fetch<ReportResponse>(recordPath(recordId, '/_report'), { method: 'GET' });

export const getChangeHistory = (http: HttpStart, recordId: string, targetId?: string) =>
  http.fetch<ChangeHistoryResponse>(recordPath(recordId, '/_history'), {
    method: 'GET',
    query: toQuery({ target_id: targetId }),
  });

export const createThread = (http: HttpStart, recordId: string, body: CreateThreadRequest) =>
  http.fetch<{ record: InvestigationRecord; thread: ThreadRef }>(recordPath(recordId, '/threads'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

export const findItems = (http: HttpStart, recordId: string, request: FindItemsRequest) =>
  http.fetch<FindItemsResponse>(getRecordItemsUrl(recordId), {
    method: 'GET',
    query: toQuery(request),
  });

export const getItem = (http: HttpStart, recordId: string, itemId: string) =>
  http.fetch<{ item: InvestigationItem }>(getRecordItemUrl(recordId, itemId), { method: 'GET' });

export const bulkCreateItems = (http: HttpStart, recordId: string, body: BulkCreateItemsRequest) =>
  http.fetch<BulkCreateItemsResponse>(itemsPath(recordId, '/_bulk_create'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Rejects with an HTTP 409 error when `body.version` no longer matches the stored item. */
export const updateItem = (
  http: HttpStart,
  recordId: string,
  itemId: string,
  body: UpdateItemRequest
) =>
  http.fetch<{ item: InvestigationItem }>(getRecordItemUrl(recordId, itemId), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const bulkUpdateItems = (http: HttpStart, recordId: string, body: BulkUpdateItemsRequest) =>
  http.fetch<BulkUpdateItemsResponse>(itemsPath(recordId, '/_bulk_update'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const bulkDeleteItems = (http: HttpStart, recordId: string, body: BulkDeleteItemsRequest) =>
  http.fetch<{ deleted: number }>(itemsPath(recordId, '/_bulk_delete'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export const importIndicators = (
  http: HttpStart,
  recordId: string,
  body: ImportIndicatorsRequest
) =>
  http.fetch<ImportIndicatorsResponse>(recordPath(recordId, '/evidence/_import'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Returns the exported text. JSON exports are re-serialized so callers always get a string. */
export const exportEvidence = async (
  http: HttpStart,
  recordId: string,
  request: ExportItemsRequest
): Promise<string> => {
  const response = await http.fetch<string | object>(recordPath(recordId, '/evidence/_export'), {
    method: 'GET',
    query: toQuery(request),
  });
  return typeof response === 'string' ? response : JSON.stringify(response, null, 2);
};

export const preserveEvidence = (http: HttpStart, recordId: string, body: { ids: string[] }) =>
  http.fetch<{ items: InvestigationItem[] }>(recordPath(recordId, '/evidence/_preserve'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const uploadFile = (
  http: HttpStart,
  recordId: string,
  { file, filename, why }: { file: File | Blob; filename?: string; why?: string }
) => {
  const form = new FormData();
  form.append('file', file);
  if (filename) {
    form.append('filename', filename);
  }
  if (why) {
    form.append('why', why);
  }
  return http.fetch<{ item: InvestigationItem }>(recordPath(recordId, '/files'), {
    method: 'POST',
    body: form,
    // Let the browser set the multipart boundary.
    headers: { 'Content-Type': undefined },
  });
};

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

export const findActivity = (http: HttpStart, recordId: string, request: FindActivityRequest) =>
  http.fetch<FindActivityResponse>(getRecordActivityUrl(recordId), {
    method: 'GET',
    query: toQuery(request),
  });

export const createActivity = (http: HttpStart, recordId: string, body: CreateActivityRequest) =>
  http.fetch<{ entry: ActivityEntry }>(getRecordActivityUrl(recordId), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */
/* Record discussion (Cases comments)                                  */
/* ------------------------------------------------------------------ */

const getRecordCommentsUrl = (recordId: string): string => recordPath(recordId, '/comments');
const getRecordCommentUrl = (recordId: string, commentId: string): string =>
  recordPath(recordId, `/comments/${encodeURIComponent(commentId)}`);

export const findComments = (http: HttpStart, recordId: string, request: FindCommentsRequest) =>
  http.fetch<FindCommentsResponse>(getRecordCommentsUrl(recordId), {
    method: 'GET',
    query: toQuery(request),
  });

export const addComment = (http: HttpStart, recordId: string, body: AddCommentRequest) =>
  http.fetch<{ comment: RecordComment }>(getRecordCommentsUrl(recordId), {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateComment = (
  http: HttpStart,
  recordId: string,
  commentId: string,
  body: UpdateCommentRequest
) =>
  http.fetch<{ comment: RecordComment }>(getRecordCommentUrl(recordId, commentId), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteComment = (http: HttpStart, recordId: string, commentId: string) =>
  http.fetch<void>(getRecordCommentUrl(recordId, commentId), { method: 'DELETE' });

/* ------------------------------------------------------------------ */
/* Statuses                                                            */
/* ------------------------------------------------------------------ */

export const getStatuses = (http: HttpStart) =>
  http.fetch<StatusesConfiguration>(INVESTIGATIONS_STATUSES_URL, { method: 'GET' });

/** Rejects with HTTP 400 (rule broken), 403 (no settings privilege) or 409 (stale `version`). */
export const saveStatuses = (http: HttpStart, body: StatusesConfiguration) =>
  http.fetch<StatusesConfiguration>(INVESTIGATIONS_STATUSES_URL, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */
/* Task lists (procedure)                                              */
/* ------------------------------------------------------------------ */

/** Sibling task ids in their new order (all roots, or all subtasks of one parent). */
export const reorderTasks = (http: HttpStart, recordId: string, body: ReorderTasksRequest) =>
  http.fetch<{ tasks: TaskItem[] }>(recordPath(recordId, '/tasks/_reorder'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Starts the workflow of an automation task. Rejects with 403 without the Workflows execute privilege. */
export const runTaskWorkflow = (http: HttpStart, recordId: string, taskId: string) =>
  http.fetch<RunTaskWorkflowResponse>(
    itemsPath(recordId, `/${encodeURIComponent(taskId)}/_run_workflow`),
    {
      method: 'POST',
    }
  );

/** Applies the procedure of the record's type (or `template_id`). */
export const applyRecordProcedure = (
  http: HttpStart,
  recordId: string,
  body: { template_id?: string | null; replace: boolean }
) =>
  http.fetch<{ tasks: TaskItem[] }>(recordPath(recordId, '/_apply_procedure'), {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Saves the task list of one investigation type. Rejects with 403 without the settings privilege. */
export const saveProcedureTemplate = (
  http: HttpStart,
  templateId: string,
  body: { tasks: ProcedureTemplateTask[] }
) =>
  http.fetch<{ template: ProcedureTemplate }>(
    `${INVESTIGATIONS_PROCEDURE_TEMPLATES_URL}/${encodeURIComponent(templateId)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );

export interface WorkflowListItem {
  id: string;
  name: string;
  enabled: boolean;
  valid: boolean;
}

/** Enabled workflows of the space (Workflows API). Rejects when Workflows is not available. */
export const getWorkflows = (http: HttpStart) =>
  http.fetch<{ results: WorkflowListItem[]; total: number }>('/api/workflows', {
    method: 'GET',
    query: { size: 100, enabled: true },
  });

/* ------------------------------------------------------------------ */
/* Explicit links (item 17)                                            */
/* ------------------------------------------------------------------ */

/** Links two investigations on both sides. Rejects with 404 when the other one cannot be read. */
export const linkRecord = (http: HttpStart, recordId: string, otherId: string) =>
  http.fetch<LinkRecordResponse>(recordPath(recordId, '/links'), {
    method: 'POST',
    body: JSON.stringify({ other_id: otherId }),
  });

export const unlinkRecord = (http: HttpStart, recordId: string, otherId: string) =>
  http.fetch<LinkRecordResponse>(recordPath(recordId, `/links/${encodeURIComponent(otherId)}`), {
    method: 'DELETE',
  });

/* Item 16 Timings */
export const getTimings = (http: HttpStart, recordId: string) =>
  http.fetch<InvestigationTimings>(recordPath(recordId, '/timings'), { method: 'GET' });

/* ------------------------------------------------------------------ */
/* External ticket: push and sync (items 10 and 11)                    */
/* ------------------------------------------------------------------ */

export const getExternalTicket = (http: HttpStart, recordId: string) =>
  http.fetch<ExternalTicketResponse>(recordPath(recordId, '/external_ticket'), { method: 'GET' });

/** Sets or removes the Cases connector and the automatic push switch. */
export const updateExternalTicket = (
  http: HttpStart,
  recordId: string,
  body: UpdateExternalTicketRequest
) =>
  http.fetch<ExternalTicketResponse>(recordPath(recordId, '/external_ticket'), {
    method: 'PUT',
    body: JSON.stringify(body),
  });

/** The Cases push: creates the incident, or updates it after the first push. */
export const pushExternalTicket = (http: HttpStart, recordId: string) =>
  http.fetch<ExternalTicketResponse>(recordPath(recordId, '/external_ticket/_push'), {
    method: 'POST',
  });

/** Pulls what changed in the incident (title, description, status). */
export const syncExternalTicket = (http: HttpStart, recordId: string) =>
  http.fetch<ExternalTicketResponse>(recordPath(recordId, '/external_ticket/_sync'), {
    method: 'POST',
  });
