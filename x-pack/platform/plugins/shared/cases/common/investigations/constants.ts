/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ALERTS_PER_CASE,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_CASES,
  MAX_CASE_ID_LENGTH,
  MAX_CASES_PER_PAGE,
  MAX_DESCRIPTION_LENGTH,
  MAX_DOCS_PER_PAGE,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
} from '../constants';

export const INVESTIGATIONS_APP_ID = 'investigations' as const;
export const INVESTIGATIONS_APP_PATH = '/app/investigations' as const;
export const INVESTIGATIONS_OWNER = 'securitySolution' as const;

export const INVESTIGATION_RECORDS_INDEX = '.kibana-cases-investigation-records' as const;
export const INVESTIGATION_ITEMS_INDEX = '.kibana-cases-investigation-items' as const;
export const INVESTIGATION_ACTIVITY_INDEX = '.kibana-cases-investigation-activity' as const;
export const INVESTIGATION_CONFIG_INDEX = '.kibana-cases-investigation-config' as const;

export const INVESTIGATIONS_INTERNAL_URL = '/internal/cases/investigations' as const;
export const INVESTIGATIONS_FIND_URL = `${INVESTIGATIONS_INTERNAL_URL}/_find` as const;
export const INVESTIGATIONS_DUPLICATES_URL = `${INVESTIGATIONS_INTERNAL_URL}/_duplicates` as const;
export const INVESTIGATIONS_INDICATOR_LOOKUP_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/_indicators` as const;
export const INVESTIGATIONS_TYPES_URL = `${INVESTIGATIONS_INTERNAL_URL}/_types` as const;
export const INVESTIGATIONS_STATUSES_URL = `${INVESTIGATIONS_INTERNAL_URL}/_statuses` as const;
export const INVESTIGATIONS_PROCEDURE_TEMPLATES_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/_procedure_templates` as const;
export const INVESTIGATIONS_CAPABILITIES_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/_capabilities` as const;

export const getRecordUrl = (recordId: string): string =>
  `${INVESTIGATIONS_INTERNAL_URL}/${encodeURIComponent(recordId)}`;
export const getRecordItemsUrl = (recordId: string): string => `${getRecordUrl(recordId)}/items`;
export const getRecordItemUrl = (recordId: string, itemId: string): string =>
  `${getRecordItemsUrl(recordId)}/${encodeURIComponent(itemId)}`;
export const getRecordActivityUrl = (recordId: string): string =>
  `${getRecordUrl(recordId)}/activity`;

/** Hard bounds shared by the routes, the service and the UI. Cases limits are reused where one exists. */
export const INVESTIGATION_LIMITS = {
  maxPerPage: MAX_CASES_PER_PAGE,
  defaultPerPage: 50,
  maxBulkItems: MAX_ALERTS_PER_CASE,
  maxAgentBulkItems: MAX_BULK_CREATE_ATTACHMENTS,
  maxTitleLength: 512,
  maxTextLength: MAX_DESCRIPTION_LENGTH,
  maxShortTextLength: 2048,
  maxIdLength: MAX_CASE_ID_LENGTH,
  maxTags: MAX_TAGS_PER_CASE,
  maxTagLength: MAX_LENGTH_PER_TAG,
  maxFields: MAX_FIELD_DEFINITIONS_PER_OWNER,
  maxIdsPerArray: MAX_BULK_GET_CASES,
  maxSearchLength: 1024,
  maxImportBytes: 10 * 1024 * 1024,
  maxSnapshotRows: 200,
  maxThreads: 100,
  maxRestrictedTo: 100,
  digestNewestItems: 5,
  maxDeepPageFrom: MAX_DOCS_PER_PAGE,
} as const;

/** Task-list limits (same names and values as Cases task lists, which are not on main yet). */
export const MAX_TASKS_PER_CASE = 100;
export const MAX_COMMENTS_PER_TASK = 100;
export const TASK_SORT_ORDER_GAP = 1000;

/** Display prefixes for item `ref` values (E12, C3, P1, T4, N2, L5, S7). */
export const ITEM_REF_PREFIX = {
  evidence: 'E',
  claim: 'C',
  proposal: 'P',
  task: 'T',
  entity: 'N',
  link: 'L',
  timeline_event: 'S',
  comment: 'M',
} as const;
