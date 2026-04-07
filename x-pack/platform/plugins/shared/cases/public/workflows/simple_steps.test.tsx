/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addAlertsStepDefinition,
  addCommentStepDefinition,
  addEventsStepDefinition,
  addObservablesStepDefinition,
  addTagsStepDefinition,
  assignCaseStepDefinition,
  closeCaseStepDefinition,
  deleteCasesStepDefinition,
  findSimilarCasesStepDefinition,
  findCasesStepDefinition,
  setCategoryStepDefinition,
  setDescriptionStepDefinition,
  setSeverityStepDefinition,
  setStatusStepDefinition,
  setTitleStepDefinition,
  unassignCaseStepDefinition,
} from './simple_steps';

describe('new cases public step definitions', () => {
  const steps = [
    addCommentStepDefinition,
    setSeverityStepDefinition,
    setStatusStepDefinition,
    closeCaseStepDefinition,
    deleteCasesStepDefinition,
    assignCaseStepDefinition,
    unassignCaseStepDefinition,
    addAlertsStepDefinition,
    addEventsStepDefinition,
    findSimilarCasesStepDefinition,
    findCasesStepDefinition,
    setDescriptionStepDefinition,
    setTitleStepDefinition,
    addObservablesStepDefinition,
    addTagsStepDefinition,
    setCategoryStepDefinition,
  ];

  it.each(steps)('returns expected metadata for %s', (definition) => {
    expect(definition.id.startsWith('cases.')).toBe(true);
    expect(definition.category).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
