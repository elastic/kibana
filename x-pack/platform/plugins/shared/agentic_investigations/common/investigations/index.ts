/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  INVESTIGATION_ASSIGNEES_URL,
  INVESTIGATION_BY_ID_URL,
  INVESTIGATION_CLOSE_URL,
  INVESTIGATION_TEMPLATE_ID,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_SHOW,
  MAX_INVESTIGATIONS_PAGE_SIZE,
} from './constants';

export {
  closeInvestigationRequestSchema,
  closeReasonSchema,
  investigationIdParamsSchema,
  updateAssigneesRequestSchema,
} from './investigation';

export type {
  CloseInvestigationRequest,
  CloseInvestigationResponse,
  CloseReason,
  InvestigationIdParams,
  UpdateAssigneesRequest,
  UpdateAssigneesResponse,
} from './investigation';
