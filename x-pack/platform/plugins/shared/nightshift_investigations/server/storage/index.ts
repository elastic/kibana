/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
  ProjectedInvestigationRecord,
} from './types';
export { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
export { SavedObjectInvestigationRepository } from './saved_object_investigation_repository';
