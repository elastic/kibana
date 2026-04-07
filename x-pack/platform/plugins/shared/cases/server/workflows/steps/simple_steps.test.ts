/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import {
  assignCaseStepDefinition,
  closeCaseStepDefinition,
  setCategoryStepDefinition,
  setDescriptionStepDefinition,
  setSeverityStepDefinition,
  setStatusStepDefinition,
  setTitleStepDefinition,
} from './simple_steps';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

type GetCasesClient = (request: KibanaRequest) => Promise<CasesClient>;

interface SimpleStepDefinition {
  id: string;
  handler: ReturnType<typeof createStepHandlerContext> extends infer TContext
    ? (context: TContext) => Promise<unknown>
    : never;
}

interface SimpleStepTestCase {
  createDefinition: (getCasesClient: GetCasesClient) => SimpleStepDefinition;
  expectedId: string;
  input: Record<string, unknown>;
  name: string;
  stepType: string;
  updatedCase: Record<string, unknown>;
  updateExpectation: Record<string, unknown>;
}

const assignees = [{ uid: 'user-1' }];

const simpleStepTestCases: SimpleStepTestCase[] = [
  {
    name: 'updates case assignees',
    stepType: 'cases.assignCase',
    expectedId: 'cases.assignCase',
    createDefinition: assignCaseStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version', assignees },
    updateExpectation: { assignees },
    updatedCase: { ...createCaseResponseFixture, assignees },
  },
  {
    name: 'closes case by setting status to closed',
    stepType: 'cases.closeCase',
    expectedId: 'cases.closeCase',
    createDefinition: closeCaseStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version' },
    updateExpectation: { status: 'closed' },
    updatedCase: { ...createCaseResponseFixture, status: 'closed' },
  },
  {
    name: 'updates case category',
    stepType: 'cases.setCategory',
    expectedId: 'cases.setCategory',
    createDefinition: setCategoryStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version', category: 'Malware' },
    updateExpectation: { category: 'Malware' },
    updatedCase: { ...createCaseResponseFixture, category: 'Malware' },
  },
  {
    name: 'updates case description',
    stepType: 'cases.setDescription',
    expectedId: 'cases.setDescription',
    createDefinition: setDescriptionStepDefinition,
    input: {
      case_id: 'case-1',
      version: 'provided-version',
      description: 'Updated description',
    },
    updateExpectation: { description: 'Updated description' },
    updatedCase: { ...createCaseResponseFixture, description: 'Updated description' },
  },
  {
    name: 'updates case severity',
    stepType: 'cases.setSeverity',
    expectedId: 'cases.setSeverity',
    createDefinition: setSeverityStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version', severity: 'high' },
    updateExpectation: { severity: 'high' },
    updatedCase: { ...createCaseResponseFixture, severity: 'high' },
  },
  {
    name: 'updates case status',
    stepType: 'cases.setStatus',
    expectedId: 'cases.setStatus',
    createDefinition: setStatusStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version', status: 'in-progress' },
    updateExpectation: { status: 'in-progress' },
    updatedCase: { ...createCaseResponseFixture, status: 'in-progress' },
  },
  {
    name: 'updates case title',
    stepType: 'cases.setTitle',
    expectedId: 'cases.setTitle',
    createDefinition: setTitleStepDefinition,
    input: { case_id: 'case-1', version: 'provided-version', title: 'Updated title' },
    updateExpectation: { title: 'Updated title' },
    updatedCase: { ...createCaseResponseFixture, title: 'Updated title' },
  },
];

const createContext = (stepType: string, input: Record<string, unknown>) =>
  createStepHandlerContext({ input, stepType });

describe('simple server step definitions', () => {
  it.each(simpleStepTestCases)('$name', async (testCase) => {
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock(
      testCase.updatedCase
    );
    const definition = testCase.createDefinition(getCasesClient);

    const result = await definition.handler(createContext(testCase.stepType, testCase.input));

    expect(definition.id).toBe(testCase.expectedId);
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          ...testCase.updateExpectation,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: testCase.updatedCase,
      },
    });
  });
});
