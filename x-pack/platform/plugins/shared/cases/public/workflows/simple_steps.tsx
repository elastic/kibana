/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
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

export const addAlertsStepDefinition = createPublicStepDefinition({
  ...addAlertsStepCommonDefinition,
});

export const addCommentStepDefinition = createPublicStepDefinition({
  ...addCommentStepCommonDefinition,
});

export const addEventsStepDefinition = createPublicStepDefinition({
  ...addEventsStepCommonDefinition,
});

export const addObservablesStepDefinition = createPublicStepDefinition({
  ...addObservablesStepCommonDefinition,
});

export const addTagsStepDefinition = createPublicStepDefinition({
  ...addTagsStepCommonDefinition,
});

export const assignCaseStepDefinition = createPublicStepDefinition({
  ...assignCaseStepCommonDefinition,
});

export const closeCaseStepDefinition = createPublicStepDefinition({
  ...closeCaseStepCommonDefinition,
});

export const deleteCasesStepDefinition = createPublicStepDefinition({
  ...deleteCasesStepCommonDefinition,
});

export const findCasesStepDefinition = createPublicStepDefinition({
  ...findCasesStepCommonDefinition,
});

export const findSimilarCasesStepDefinition = createPublicStepDefinition({
  ...findSimilarCasesStepCommonDefinition,
});

export const getCaseStepDefinition = createPublicStepDefinition({
  ...getCaseStepCommonDefinition,
});

export const setCategoryStepDefinition = createPublicStepDefinition({
  ...setCategoryStepCommonDefinition,
});

export const setDescriptionStepDefinition = createPublicStepDefinition({
  ...setDescriptionStepCommonDefinition,
});

export const setSeverityStepDefinition = createPublicStepDefinition({
  ...setSeverityStepCommonDefinition,
});

export const setStatusStepDefinition = createPublicStepDefinition({
  ...setStatusStepCommonDefinition,
});

export const setTitleStepDefinition = createPublicStepDefinition({
  ...setTitleStepCommonDefinition,
});

export const unassignCaseStepDefinition = createPublicStepDefinition({
  ...unassignCaseStepCommonDefinition,
});

export const updateCaseStepDefinition = createPublicStepDefinition({
  ...updateCaseStepCommonDefinition,
});

export const updateCasesStepDefinition = createPublicStepDefinition({
  ...updateCasesStepCommonDefinition,
});
