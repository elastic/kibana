/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addAlertsStepCommonDefinition } from '../../common/workflows/steps/add_alerts';
import { addCommentStepCommonDefinition } from '../../common/workflows/steps/add_comment';
import { addEventsStepCommonDefinition } from '../../common/workflows/steps/add_events';
import { addObservablesStepCommonDefinition } from '../../common/workflows/steps/add_observables';
import { addTagsStepCommonDefinition } from '../../common/workflows/steps/add_tags';
import { assignCaseStepCommonDefinition } from '../../common/workflows/steps/assign_case';
import { closeCaseStepCommonDefinition } from '../../common/workflows/steps/close_case';
import { deleteCasesStepCommonDefinition } from '../../common/workflows/steps/delete_cases';
import { findCasesStepCommonDefinition } from '../../common/workflows/steps/find_cases';
import { findSimilarCasesStepCommonDefinition } from '../../common/workflows/steps/find_similar_cases';
import { getCaseStepCommonDefinition } from '../../common/workflows/steps/get_case';
import { setCategoryStepCommonDefinition } from '../../common/workflows/steps/set_category';
import { setDescriptionStepCommonDefinition } from '../../common/workflows/steps/set_description';
import { setSeverityStepCommonDefinition } from '../../common/workflows/steps/set_severity';
import { setStatusStepCommonDefinition } from '../../common/workflows/steps/set_status';
import { setTitleStepCommonDefinition } from '../../common/workflows/steps/set_title';
import { unassignCaseStepCommonDefinition } from '../../common/workflows/steps/unassign_case';
import { updateCaseStepCommonDefinition } from '../../common/workflows/steps/update_case';
import { updateCasesStepCommonDefinition } from '../../common/workflows/steps/update_cases';
import { createPublicCaseStepDefinition } from './shared';

export const addAlertsStepDefinition = createPublicCaseStepDefinition({
  ...addAlertsStepCommonDefinition,
});

export const addCommentStepDefinition = createPublicCaseStepDefinition({
  ...addCommentStepCommonDefinition,
});

export const addEventsStepDefinition = createPublicCaseStepDefinition({
  ...addEventsStepCommonDefinition,
});

export const addObservablesStepDefinition = createPublicCaseStepDefinition({
  ...addObservablesStepCommonDefinition,
});

export const addTagsStepDefinition = createPublicCaseStepDefinition({
  ...addTagsStepCommonDefinition,
});

export const assignCaseStepDefinition = createPublicCaseStepDefinition({
  ...assignCaseStepCommonDefinition,
});

export const closeCaseStepDefinition = createPublicCaseStepDefinition({
  ...closeCaseStepCommonDefinition,
});

export const deleteCasesStepDefinition = createPublicCaseStepDefinition({
  ...deleteCasesStepCommonDefinition,
});

export const findCasesStepDefinition = createPublicCaseStepDefinition({
  ...findCasesStepCommonDefinition,
});

export const findSimilarCasesStepDefinition = createPublicCaseStepDefinition({
  ...findSimilarCasesStepCommonDefinition,
});

export const getCaseStepDefinition = createPublicCaseStepDefinition({
  ...getCaseStepCommonDefinition,
});

export const setCategoryStepDefinition = createPublicCaseStepDefinition({
  ...setCategoryStepCommonDefinition,
});

export const setDescriptionStepDefinition = createPublicCaseStepDefinition({
  ...setDescriptionStepCommonDefinition,
});

export const setSeverityStepDefinition = createPublicCaseStepDefinition({
  ...setSeverityStepCommonDefinition,
});

export const setStatusStepDefinition = createPublicCaseStepDefinition({
  ...setStatusStepCommonDefinition,
});

export const setTitleStepDefinition = createPublicCaseStepDefinition({
  ...setTitleStepCommonDefinition,
});

export const unassignCaseStepDefinition = createPublicCaseStepDefinition({
  ...unassignCaseStepCommonDefinition,
});

export const updateCaseStepDefinition = createPublicCaseStepDefinition({
  ...updateCaseStepCommonDefinition,
});

export const updateCasesStepDefinition = createPublicCaseStepDefinition({
  ...updateCasesStepCommonDefinition,
});
