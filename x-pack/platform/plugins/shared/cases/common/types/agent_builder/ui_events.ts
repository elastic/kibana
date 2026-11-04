/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tool UI event sent when an agent tool changes one or more cases,
 * so an open case view can refresh while the run is still in progress.
 */
export const CASES_UPDATED_UI_EVENT = 'cases:updated';

export interface CasesUpdatedUiEventData {
  caseIds: string[];
}
