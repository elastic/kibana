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
  INVESTIGATIONS_TYPES_URL,
  getRecordActivityUrl,
  getRecordItemUrl,
  getRecordItemsUrl,
  getRecordUrl,
} from '../../../common/investigations/constants';
import type {
  ActivityEntry,
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
  FindActivityRequest,
  FindActivityResponse,
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
  InvestigationType,
  MergeRecordRequest,
  MergeRecordResponse,
  ProcedureTemplate,
  ProcedureTemplateTask,
  RelatedRecord,
  RelatedRecordsResponse,
  ReportResponse,
  SinceLastHandoffResponse,
  TaskItem,
  ThreadRef,
  UpdateItemRequest,
  UpdateRecordRequest,
} from '../../../common/investigations/types';

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

export const updateProcedureTemplate = (
  http: HttpStart,
  type: string,
  body: { tasks: ProcedureTemplateTask[] }
) =>
  http.fetch<{ template: ProcedureTemplate }>(
    `${INVESTIGATIONS_PROCEDURE_TEMPLATES_URL}/${encodeURIComponent(type)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );

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

export const applyProcedure = (
  http: HttpStart,
  recordId: string,
  body: { type: string; replace?: boolean }
) =>
  http.fetch<{ tasks: TaskItem[] }>(recordPath(recordId, '/_apply_procedure'), {
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
