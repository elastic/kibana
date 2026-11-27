/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { ConfigurationAttributes, Observable } from '../../../common/types/domain';
import { CaseStatuses, ConnectorTypes, UserActionTypes } from '../../../common/types/domain';
import { mockCases } from '../../mocks';
import { flattenCaseSavedObject } from '../../common/utils';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockObservablesPreviewSearchFailure } from '../../services/mocks';
import { push } from './push';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  createIncident: jest.fn().mockResolvedValue({}),
  getUserProfiles: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('../alerts/get', () => ({
  getAlerts: jest.fn().mockResolvedValue([]),
}));

describe('push', () => {
  const fieldObservable: Observable = {
    id: 'field-1',
    typeKey: 'observable-type-ipv4',
    value: '10.0.0.1',
    description: null,
    createdAt: '2026-11-06T09:30:00.000Z',
    updatedAt: null,
  };
  const typeObservable: Observable = { ...fieldObservable, id: 'type-1', value: '10.0.0.2' };
  const theCase: CaseSavedObjectTransformed = {
    ...mockCases[0],
    attributes: {
      ...mockCases[0].attributes,
      observables: [fieldObservable],
      total_observables: 1,
      settings: { ...mockCases[0].attributes.settings, syncAlerts: true },
    },
  };
  const closeByPushing: SavedObjectsFindResponse<ConfigurationAttributes> = {
    saved_objects: [
      {
        id: 'configuration-1',
        type: 'cases-configure',
        references: [],
        score: 0,
        attributes: {
          connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
          closure_type: 'close-by-pushing',
          customFields: [],
          templates: [],
          observableTypes: [],
          extractObservables: false,
          workflowTags: [],
          owner: SECURITY_SOLUTION_OWNER,
          created_at: '2026-11-06T09:30:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          updated_at: null,
          updated_by: null,
        },
      },
    ],
    total: 1,
    page: 1,
    per_page: 1,
  };

  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const pushParams = {
    caseId: theCase.id,
    connectorId: 'connector-1',
    pushType: 'manual' as const,
  };

  const userActionTypes = (): string[] =>
    clientArgs.services.userActionService.creator.createUserAction.mock.calls.map(
      ([{ userAction }]) => userAction.type
    );

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient.cases.get.mockResolvedValue(flattenCaseSavedObject({ savedObject: theCase }));
    casesClient.userActions.getAll.mockResolvedValue([]);
    clientArgs.actionsClient.get.mockResolvedValue({
      id: 'connector-1',
      name: 'ServiceNow',
      actionTypeId: '.servicenow',
    } as Awaited<ReturnType<typeof clientArgs.actionsClient.get>>);
    clientArgs.actionsClient.execute.mockResolvedValue({
      actionId: 'connector-1',
      status: 'ok',
      data: {
        id: 'incident-1',
        title: 'INC-1',
        url: 'https://example.com/INC-1',
        pushedDate: '2026-11-06T09:30:00.000Z',
      },
    });
    clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
    clientArgs.services.caseConfigureService.find.mockResolvedValue(closeByPushing);
    clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 10,
      page: 1,
    });
    clientArgs.services.caseService.patchCase.mockImplementation(
      async ({ originalCase, updatedAttributes }) => ({
        ...originalCase,
        attributes: updatedAttributes,
      })
    );
    clientArgs.services.attachmentService.bulkUpdate.mockResolvedValue({ saved_objects: [] });
    clientArgs.services.observableService.getter.getPreviews.mockResolvedValue(
      new Map([[theCase.id, { count: 3, oldest: [typeObservable] }]])
    );
  });

  it('lists the field first, then the oldest objects, and counts both stores', async () => {
    const pushedCase = await push(pushParams, clientArgs, casesClient);

    expect(pushedCase.observables).toEqual([fieldObservable, typeObservable]);
    expect(pushedCase.total_observables).toBe(4);
    expect(clientArgs.services.observableService.getter.getPreviews).toHaveBeenCalledWith(
      [{ id: theCase.id, observables: [fieldObservable] }],
      { ignoreErrors: true }
    );
  });

  /*
   * FAILURE SCENARIO: the preview search fails after the push is saved on the case.
   * Symptom: the push succeeds and its response lists the case field's observables only.
   * Log signature: `Failed to get the observables previews of 1 cases` (error, from the service).
   * Trigger: Elasticsearch rejects or times out the search on `.kibana_alerting_cases`.
   * Recovery: none needed; the closed and pushed user actions are recorded and the synced alerts
   *   are closed, and the next read lists both stores.
   */
  it('records the user actions and closes the alerts when the preview fails', async () => {
    mockObservablesPreviewSearchFailure(clientArgs.services.observableService);

    const pushedCase = await push(pushParams, clientArgs, casesClient);

    expect(pushedCase.status).toBe(CaseStatuses.closed);
    expect(pushedCase.observables).toEqual([fieldObservable]);
    expect(pushedCase.total_observables).toBe(1);
    expect(userActionTypes()).toEqual([UserActionTypes.status, UserActionTypes.pushed]);
    expect(clientArgs.services.alertsService.updateAlertsStatus).toHaveBeenCalledTimes(1);
  });
});
