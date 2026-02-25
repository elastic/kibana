/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSetSeverityStepDefinition } from './set_severity';
import { createSetStatusStepDefinition } from './set_status';
import { createCloseCaseStepDefinition } from './close_case';
import { createAssignCaseStepDefinition } from './assign_case';
import { createUnassignCaseStepDefinition } from './unassign_case';
import { createAddAlertsStepDefinition } from './add_alerts';
import { createAddEventsStepDefinition } from './add_events';
import { createFindSimilarCasesStepDefinition } from './find_similar_cases';
import { createSetDescriptionStepDefinition } from './set_description';
import { createSetTitleStepDefinition } from './set_title';
import { createAddObservablesStepDefinition } from './add_observables';
import { createAddTagStepDefinition } from './add_tag';
import { createAddCategoryStepDefinition } from './add_category';

describe('new cases public step definitions', () => {
  const steps = [
    createSetSeverityStepDefinition(),
    createSetStatusStepDefinition(),
    createCloseCaseStepDefinition(),
    createAssignCaseStepDefinition(),
    createUnassignCaseStepDefinition(),
    createAddAlertsStepDefinition(),
    createAddEventsStepDefinition(),
    createFindSimilarCasesStepDefinition(),
    createSetDescriptionStepDefinition(),
    createSetTitleStepDefinition(),
    createAddObservablesStepDefinition(),
    createAddTagStepDefinition(),
    createAddCategoryStepDefinition(),
  ];

  it.each(steps)('returns expected metadata for %s', (definition) => {
    expect(definition.id.startsWith('cases.')).toBe(true);
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
