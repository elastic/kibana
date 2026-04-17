/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { unassignCaseStepDefinition } from './unassign_case';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.unassignCase' });

describe('unassignCaseStepDefinition', () => {
  it('unassigns everyone when assignees is an empty array', async () => {
    const assignees: Array<{ uid: string }> = [];
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      assignees,
    });
    const definition = unassignCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', assignees })
    );

    expect(definition.id).toBe('cases.unassignCase');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          assignees,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, assignees },
      },
    });
  });

  it('unassigns everyone when assignees is null', async () => {
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      assignees: [],
    });
    const definition = unassignCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', assignees: null })
    );

    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          assignees: [],
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, assignees: [] },
      },
    });
  });

  it('unassigns only the requested users when assignees are provided', async () => {
    const existingAssignees = [{ uid: 'user-1' }, { uid: 'user-2' }, { uid: 'user-3' }];
    const assigneesToRemove = [{ uid: 'user-2' }];
    const assigneesAfterUnassign = [{ uid: 'user-1' }, { uid: 'user-3' }];
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      assignees: assigneesAfterUnassign,
    });
    get.mockResolvedValue({
      ...createCaseResponseFixture,
      assignees: existingAssignees,
    });
    const definition = unassignCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        version: 'provided-version',
        assignees: assigneesToRemove,
      })
    );

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          assignees: assigneesAfterUnassign,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, assignees: assigneesAfterUnassign },
      },
    });
  });
});
