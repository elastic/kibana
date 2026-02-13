/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { getCaseStepCommonDefinition } from './get_case';
import { createCaseStepCommonDefinition } from './create_case';
import { updateCaseStepCommonDefinition } from './update_case';
import { addCommentStepCommonDefinition } from './add_comment';

// Export specific items to avoid naming conflicts for generic schema names
export {
  GetCaseStepTypeId,
  getCaseStepCommonDefinition,
  type GetCaseStepInputSchema,
  type GetCaseStepOutputSchema,
  type GetCaseStepConfigSchema,
  type GetCaseStepInput,
  type GetCaseStepOutput,
  type GetCaseStepConfig,
} from './get_case';

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

export {
  UpdateCaseStepTypeId,
  updateCaseStepCommonDefinition,
  type UpdateCaseStepInputSchema,
  type UpdateCaseStepOutputSchema,
  type UpdateCaseStepInput,
  type UpdateCaseStepOutput,
} from './update_case';

export {
  AddCommentStepTypeId,
  addCommentStepCommonDefinition,
  type AddCommentStepInputSchema,
  type AddCommentStepOutputSchema,
  type AddCommentStepInput,
  type AddCommentStepOutput,
} from './add_comment';

/**
 * Collection for cases workflow step definitions.
 * Each concrete step implementation will register its common definition here.
 */
export const casesWorkflowSteps: ReadonlyArray<CommonStepDefinition> = Object.freeze([
  getCaseStepCommonDefinition,
  createCaseStepCommonDefinition,
  updateCaseStepCommonDefinition,
  addCommentStepCommonDefinition,
]);

/**
 * Utility to register additional case workflow steps when they become available.
 */
export const registerCasesWorkflowStep = (
  step: CommonStepDefinition
): ReadonlyArray<CommonStepDefinition> => Object.freeze([...casesWorkflowSteps, step]);
