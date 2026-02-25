/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AddAlertsStepTypeId,
  addAlertsStepCommonDefinition,
  AddCategoryStepTypeId,
  addCategoryStepCommonDefinition,
  AddEventsStepTypeId,
  addEventsStepCommonDefinition,
  AddObservablesStepTypeId,
  addObservablesStepCommonDefinition,
  AddTagStepTypeId,
  addTagStepCommonDefinition,
  AssignCaseStepTypeId,
  assignCaseStepCommonDefinition,
  CloseCaseStepTypeId,
  closeCaseStepCommonDefinition,
  FindSimilarCasesStepTypeId,
  findSimilarCasesStepCommonDefinition,
  UnassignCaseStepTypeId,
  unassignCaseStepCommonDefinition,
  SetDescriptionStepTypeId,
  setDescriptionStepCommonDefinition,
  SetSeverityStepTypeId,
  setSeverityStepCommonDefinition,
  SetStatusStepTypeId,
  setStatusStepCommonDefinition,
  SetTitleStepTypeId,
  setTitleStepCommonDefinition,
} from './index';
import {
  addAlertsInputFixture,
  addCategoryInputFixture,
  addEventsInputFixture,
  addObservablesInputFixture,
  addTagInputFixture,
  assignCaseInputFixture,
  closeCaseInputFixture,
  createCaseResponseFixture,
  findSimilarCasesInputFixture,
  findSimilarCasesOutputFixture,
  setDescriptionInputFixture,
  setSeverityInputFixture,
  setStatusInputFixture,
  setTitleInputFixture,
  unassignCaseInputFixture,
} from './test_fixtures';

describe('new cases common step definitions', () => {
  it('exposes expected step ids', () => {
    expect(setSeverityStepCommonDefinition.id).toBe(SetSeverityStepTypeId);
    expect(setStatusStepCommonDefinition.id).toBe(SetStatusStepTypeId);
    expect(closeCaseStepCommonDefinition.id).toBe(CloseCaseStepTypeId);
    expect(assignCaseStepCommonDefinition.id).toBe(AssignCaseStepTypeId);
    expect(unassignCaseStepCommonDefinition.id).toBe(UnassignCaseStepTypeId);
    expect(addAlertsStepCommonDefinition.id).toBe(AddAlertsStepTypeId);
    expect(addEventsStepCommonDefinition.id).toBe(AddEventsStepTypeId);
    expect(findSimilarCasesStepCommonDefinition.id).toBe(FindSimilarCasesStepTypeId);
    expect(setDescriptionStepCommonDefinition.id).toBe(SetDescriptionStepTypeId);
    expect(setTitleStepCommonDefinition.id).toBe(SetTitleStepTypeId);
    expect(addObservablesStepCommonDefinition.id).toBe(AddObservablesStepTypeId);
    expect(addTagStepCommonDefinition.id).toBe(AddTagStepTypeId);
    expect(addCategoryStepCommonDefinition.id).toBe(AddCategoryStepTypeId);
  });

  it('accepts valid input payloads', () => {
    expect(setSeverityStepCommonDefinition.inputSchema.safeParse(setSeverityInputFixture).success).toBe(
      true
    );
    expect(setStatusStepCommonDefinition.inputSchema.safeParse(setStatusInputFixture).success).toBe(true);
    expect(closeCaseStepCommonDefinition.inputSchema.safeParse(closeCaseInputFixture).success).toBe(true);
    expect(assignCaseStepCommonDefinition.inputSchema.safeParse(assignCaseInputFixture).success).toBe(true);
    expect(
      unassignCaseStepCommonDefinition.inputSchema.safeParse(unassignCaseInputFixture).success
    ).toBe(true);
    expect(addAlertsStepCommonDefinition.inputSchema.safeParse(addAlertsInputFixture).success).toBe(
      true
    );
    expect(addEventsStepCommonDefinition.inputSchema.safeParse(addEventsInputFixture).success).toBe(
      true
    );
    expect(
      findSimilarCasesStepCommonDefinition.inputSchema.safeParse(findSimilarCasesInputFixture).success
    ).toBe(true);
    expect(
      setDescriptionStepCommonDefinition.inputSchema.safeParse(setDescriptionInputFixture).success
    ).toBe(true);
    expect(setTitleStepCommonDefinition.inputSchema.safeParse(setTitleInputFixture).success).toBe(
      true
    );
    expect(
      addObservablesStepCommonDefinition.inputSchema.safeParse(addObservablesInputFixture).success
    ).toBe(true);
    expect(addTagStepCommonDefinition.inputSchema.safeParse(addTagInputFixture).success).toBe(true);
    expect(addCategoryStepCommonDefinition.inputSchema.safeParse(addCategoryInputFixture).success).toBe(
      true
    );
  });

  it('accepts valid output payloads', () => {
    expect(setSeverityStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(setStatusStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(closeCaseStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(assignCaseStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(unassignCaseStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(addAlertsStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(addEventsStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(setDescriptionStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(setTitleStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(addObservablesStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(addTagStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);
    expect(addCategoryStepCommonDefinition.outputSchema.safeParse({ case: createCaseResponseFixture }).success).toBe(true);

    const similarOutput =
      findSimilarCasesStepCommonDefinition.outputSchema.safeParse(findSimilarCasesOutputFixture);

    expect(similarOutput.success).toBe(true);
  });
});
