/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AddAlertsStepTypeId,
  addAlertsStepCommonDefinition,
  SetCategoryStepTypeId,
  setCategoryStepCommonDefinition,
  AddEventsStepTypeId,
  addEventsStepCommonDefinition,
  AddObservablesStepTypeId,
  addObservablesStepCommonDefinition,
  AddTagsStepTypeId,
  addTagsStepCommonDefinition,
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
} from '.';
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

const singleCaseOutput = { case: createCaseResponseFixture };

const stepDefinitions = [
  {
    typeId: SetSeverityStepTypeId,
    definition: setSeverityStepCommonDefinition,
    input: setSeverityInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: SetStatusStepTypeId,
    definition: setStatusStepCommonDefinition,
    input: setStatusInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: CloseCaseStepTypeId,
    definition: closeCaseStepCommonDefinition,
    input: closeCaseInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: AssignCaseStepTypeId,
    definition: assignCaseStepCommonDefinition,
    input: assignCaseInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: UnassignCaseStepTypeId,
    definition: unassignCaseStepCommonDefinition,
    input: unassignCaseInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: AddAlertsStepTypeId,
    definition: addAlertsStepCommonDefinition,
    input: addAlertsInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: AddEventsStepTypeId,
    definition: addEventsStepCommonDefinition,
    input: addEventsInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: FindSimilarCasesStepTypeId,
    definition: findSimilarCasesStepCommonDefinition,
    input: findSimilarCasesInputFixture,
    output: findSimilarCasesOutputFixture,
  },
  {
    typeId: SetDescriptionStepTypeId,
    definition: setDescriptionStepCommonDefinition,
    input: setDescriptionInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: SetTitleStepTypeId,
    definition: setTitleStepCommonDefinition,
    input: setTitleInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: AddObservablesStepTypeId,
    definition: addObservablesStepCommonDefinition,
    input: addObservablesInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: AddTagsStepTypeId,
    definition: addTagsStepCommonDefinition,
    input: addTagInputFixture,
    output: singleCaseOutput,
  },
  {
    typeId: SetCategoryStepTypeId,
    definition: setCategoryStepCommonDefinition,
    input: addCategoryInputFixture,
    output: singleCaseOutput,
  },
] as const;

describe('cases common step definitions', () => {
  it.each(stepDefinitions)('exposes expected id for $typeId', ({ typeId, definition }) => {
    expect(definition.id).toBe(typeId);
  });

  it.each(stepDefinitions)('accepts valid input payload for $typeId', ({ definition, input }) => {
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it.each(stepDefinitions)('accepts valid output payload for $typeId', ({ definition, output }) => {
    expect(definition.outputSchema.safeParse(output).success).toBe(true);
  });
});
