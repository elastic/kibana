/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  assignCaseStepCommonDefinition,
  type AssignCaseStepInput,
} from '../../../common/workflows/steps/assign_case';
import {
  closeCaseStepCommonDefinition,
  type CloseCaseStepInput,
} from '../../../common/workflows/steps/close_case';
import {
  setCategoryStepCommonDefinition,
  type SetCategoryStepInput,
} from '../../../common/workflows/steps/set_category';
import {
  setDescriptionStepCommonDefinition,
  type SetDescriptionStepInput,
} from '../../../common/workflows/steps/set_description';
import {
  setSeverityStepCommonDefinition,
  type SetSeverityStepInput,
} from '../../../common/workflows/steps/set_severity';
import {
  setStatusStepCommonDefinition,
  type SetStatusStepInput,
} from '../../../common/workflows/steps/set_status';
import {
  setTitleStepCommonDefinition,
  type SetTitleStepInput,
} from '../../../common/workflows/steps/set_title';
import type { CasesClient } from '../../client';
import { createUpdateSingleCaseStepHandler } from './update_case_helpers';

export const assignCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...assignCaseStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<AssignCaseStepInput>(getCasesClient, (input) => ({
      assignees: input.assignees,
    })),
  });

export const closeCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...closeCaseStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<CloseCaseStepInput>(getCasesClient, () => ({
      status: 'closed',
    })),
  });

export const setCategoryStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setCategoryStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetCategoryStepInput>(getCasesClient, (input) => ({
      category: input.category,
    })),
  });

export const setDescriptionStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setDescriptionStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetDescriptionStepInput>(
      getCasesClient,
      (input) => ({ description: input.description })
    ),
  });

export const setSeverityStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setSeverityStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetSeverityStepInput>(getCasesClient, (input) => ({
      severity: input.severity,
    })),
  });

export const setStatusStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setStatusStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetStatusStepInput>(getCasesClient, (input) => ({
      status: input.status,
    })),
  });

export const setTitleStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setTitleStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetTitleStepInput>(getCasesClient, (input) => ({
      title: input.title,
    })),
  });
