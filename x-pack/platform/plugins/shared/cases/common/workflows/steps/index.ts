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
import { updateCasesStepCommonDefinition } from './update_cases';
import { setCustomFieldStepCommonDefinition } from './set_custom_field';
import { addCommentStepCommonDefinition } from './add_comment';
import { findCasesStepCommonDefinition } from './find_cases';
import { setSeverityStepCommonDefinition } from './set_severity';
import { setStatusStepCommonDefinition } from './set_status';
import { closeCaseStepCommonDefinition } from './close_case';
import { assignCaseStepCommonDefinition } from './assign_case';
import { unassignCaseStepCommonDefinition } from './unassign_case';
import { addAlertsStepCommonDefinition } from './add_alerts';
import { addEventsStepCommonDefinition } from './add_events';
import { findSimilarCasesStepCommonDefinition } from './find_similar_cases';
import { setDescriptionStepCommonDefinition } from './set_description';
import { setTitleStepCommonDefinition } from './set_title';
import { addObservablesStepCommonDefinition } from './add_observables';
import { addTagStepCommonDefinition } from './add_tag';
import { addCategoryStepCommonDefinition } from './add_category';

export { GetCaseStepTypeId, getCaseStepCommonDefinition } from './get_case';
export { CreateCaseStepTypeId, createCaseStepCommonDefinition } from './create_case';
export {
  CreateCaseFromTemplateStepTypeId,
  createCaseFromTemplateStepCommonDefinition,
} from './create_case_from_template';
export { UpdateCaseStepTypeId, updateCaseStepCommonDefinition } from './update_case';
export { UpdateCasesStepTypeId, updateCasesStepCommonDefinition } from './update_cases';
export { SetCustomFieldStepTypeId, setCustomFieldStepCommonDefinition } from './set_custom_field';
export { AddCommentStepTypeId, addCommentStepCommonDefinition } from './add_comment';
export { FindCasesStepTypeId, findCasesStepCommonDefinition } from './find_cases';
export { SetSeverityStepTypeId, setSeverityStepCommonDefinition } from './set_severity';
export { SetStatusStepTypeId, setStatusStepCommonDefinition } from './set_status';
export { CloseCaseStepTypeId, closeCaseStepCommonDefinition } from './close_case';
export { AssignCaseStepTypeId, assignCaseStepCommonDefinition } from './assign_case';
export { UnassignCaseStepTypeId, unassignCaseStepCommonDefinition } from './unassign_case';
export { AddAlertsStepTypeId, addAlertsStepCommonDefinition } from './add_alerts';
export { AddEventsStepTypeId, addEventsStepCommonDefinition } from './add_events';
export {
  FindSimilarCasesStepTypeId,
  findSimilarCasesStepCommonDefinition,
} from './find_similar_cases';
export { SetDescriptionStepTypeId, setDescriptionStepCommonDefinition } from './set_description';
export { SetTitleStepTypeId, setTitleStepCommonDefinition } from './set_title';
export { AddObservablesStepTypeId, addObservablesStepCommonDefinition } from './add_observables';
export { AddTagStepTypeId, addTagStepCommonDefinition } from './add_tag';
export { AddCategoryStepTypeId, addCategoryStepCommonDefinition } from './add_category';

export const casesWorkflowSteps: ReadonlyArray<CommonStepDefinition> = Object.freeze([
  getCaseStepCommonDefinition,
  createCaseStepCommonDefinition,
  createCaseFromTemplateStepCommonDefinition,
  updateCaseStepCommonDefinition,
  updateCasesStepCommonDefinition,
  setCustomFieldStepCommonDefinition,
  addCommentStepCommonDefinition,
  findCasesStepCommonDefinition,
  setSeverityStepCommonDefinition,
  setStatusStepCommonDefinition,
  closeCaseStepCommonDefinition,
  assignCaseStepCommonDefinition,
  unassignCaseStepCommonDefinition,
  addAlertsStepCommonDefinition,
  addEventsStepCommonDefinition,
  findSimilarCasesStepCommonDefinition,
  setDescriptionStepCommonDefinition,
  setTitleStepCommonDefinition,
  addObservablesStepCommonDefinition,
  addTagStepCommonDefinition,
  addCategoryStepCommonDefinition,
]);

export const registerCasesWorkflowStep = (
  step: CommonStepDefinition
): ReadonlyArray<CommonStepDefinition> => Object.freeze([...casesWorkflowSteps, step]);
