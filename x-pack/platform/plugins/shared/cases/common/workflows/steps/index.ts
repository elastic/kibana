/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { getCaseStepCommonDefinition } from './get_case';
import { createCaseStepCommonDefinition } from './create_case';
import { createCaseFromTemplateStepCommonDefinition } from './create_case_from_template';
import { updateCaseStepCommonDefinition } from './update_case';
import { addCommentStepCommonDefinition } from './add_comment';

export { GetCaseStepTypeId, getCaseStepCommonDefinition } from './get_case';
export { CreateCaseStepTypeId, createCaseStepCommonDefinition } from './create_case';
export {
  CreateCaseFromTemplateStepTypeId,
  createCaseFromTemplateStepCommonDefinition,
} from './create_case_from_template';
export { UpdateCaseStepTypeId, updateCaseStepCommonDefinition } from './update_case';
export { AddCommentStepTypeId, addCommentStepCommonDefinition } from './add_comment';

export const casesWorkflowSteps: ReadonlyArray<CommonStepDefinition> = Object.freeze([
  getCaseStepCommonDefinition,
  createCaseStepCommonDefinition,
  createCaseFromTemplateStepCommonDefinition,
  updateCaseStepCommonDefinition,
  addCommentStepCommonDefinition,
]);

export const registerCasesWorkflowStep = (
  step: CommonStepDefinition
): ReadonlyArray<CommonStepDefinition> => Object.freeze([...casesWorkflowSteps, step]);
