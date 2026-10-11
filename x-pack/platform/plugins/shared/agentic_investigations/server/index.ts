/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';

// Lazy-imported so a disabled plugin never parses its implementation.
export async function plugin(initializerContext: PluginInitializerContext) {
  const { AgenticInvestigationsPlugin } = await import('./plugin');
  return new AgenticInvestigationsPlugin(initializerContext);
}

export type { AgenticInvestigationsPluginSetup, AgenticInvestigationsPluginStart } from './types';
export type { SubjectsClient } from './subjects/services/subjects_client';
export type { DeleteInvestigationDataAcrossSpacesResult } from './investigations/services/delete_investigation_data_across_spaces';
export type {
  DeleteInvestigationDataResult,
  InvestigationsClient,
} from './investigations/services/investigations_client';
export type {
  ClaimSubjectsParams,
  ClaimSubjectsResult,
} from './subjects/services/subject_claims_service';
