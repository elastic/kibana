/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { getCaseByIdStepCommonDefinition } from './get_case_by_id';
import { createCaseStepCommonDefinition } from './create_case';

// Export specific items to avoid naming conflicts for generic schema names
export {
  GetCaseByIdStepTypeId,
  getCaseByIdStepCommonDefinition,
  type GetCaseByIdStepInputSchema,
  type GetCaseByIdStepOutputSchema,
  type GetCaseByIdStepConfigSchema,
  type GetCaseByIdStepInput,
  type GetCaseByIdStepOutput,
  type GetCaseByIdStepConfig,
} from './get_case_by_id';

export {
  CreateCaseStepTypeId,
  createCaseStepCommonDefinition,
  type CreateCaseStepInputSchema,
  type CreateCaseStepOutputSchema,
  type CreateCaseStepConfigSchema,
  type CreateCaseStepInput,
  type CreateCaseStepOutput,
  type CreateCaseStepConfig,
} from './create_case';

/**
 * Collection for cases workflow step definitions.
 * Each concrete step implementation will register its common definition here.
 */
export const casesWorkflowSteps: ReadonlyArray<CommonStepDefinition> = Object.freeze([
  getCaseByIdStepCommonDefinition,
  createCaseStepCommonDefinition,
]);

/**
 * Utility to register additional case workflow steps when they become available.
 */
export const registerCasesWorkflowStep = (
  step: CommonStepDefinition
): ReadonlyArray<CommonStepDefinition> => Object.freeze([...casesWorkflowSteps, step]);
