/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setSeverityStepDefinition } from './set_severity';
import { setStatusStepDefinition } from './set_status';
import { closeCaseStepDefinition } from './close_case';
import { assignCaseStepDefinition } from './assign_case';
import { unassignCaseStepDefinition } from './unassign_case';
import { addAlertsStepDefinition } from './add_alerts';
import { addEventsStepDefinition } from './add_events';
import { findSimilarCasesStepDefinition } from './find_similar_cases';
import { setDescriptionStepDefinition } from './set_description';
import { setTitleStepDefinition } from './set_title';
import { addObservablesStepDefinition } from './add_observables';
import { addTagStepDefinition } from './add_tag';
import { addCategoryStepDefinition } from './add_category';

describe('new cases public step definitions', () => {
  const steps = [
    setSeverityStepDefinition,
    setStatusStepDefinition,
    closeCaseStepDefinition,
    assignCaseStepDefinition,
    unassignCaseStepDefinition,
    addAlertsStepDefinition,
    addEventsStepDefinition,
    findSimilarCasesStepDefinition,
    setDescriptionStepDefinition,
    setTitleStepDefinition,
    addObservablesStepDefinition,
    addTagStepDefinition,
    addCategoryStepDefinition,
  ];

  it.each(steps)('returns expected metadata for %s', (definition) => {
    expect(definition.id.startsWith('cases.')).toBe(true);
    expect(definition.category).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
