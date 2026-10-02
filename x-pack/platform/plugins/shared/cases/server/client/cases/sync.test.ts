/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { CaseStatuses, ConnectorTypes, UserActionTypes } from '../../../common/types/domain';
import type { CaseUserActionsDeprecatedResponse } from '../../../common/types/api';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { mockCases } from '../../mocks';
import { flattenCaseSavedObject } from '../../common/utils';
import { SYNC_CASE_APPLIED_COUNTER, SYNC_CASE_NO_CHANGES_COUNTER } from '../usage_counters';
import { resolveExternalSyncFieldRules } from '../../../common/utils/external_sync_fields';
import {
  buildSyncPatch,
  isPushedFromKibana,
  selectCommentsToImport,
  stripKibanaInformationFromDescription,
  sync,
} from './sync';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';

const externalService = {
  connector_id: 'sn-1',
  connector_name: 'ServiceNow',
  external_id: '123',
  external_title: 'INC01',
  external_url: 'https://sn.example.com/INC01',
  pushed_at: '2026-09-01T00:00:00.000Z',
  pushed_by: { username: 'elastic', full_name: null, email: null },
};

const theCase: Case = {
  ...flattenCaseSavedObject({ savedObject: mockCases[0] }),
  connector: { id: 'sn-1', name: 'ServiceNow', type: ConnectorTypes.serviceNowITSM, fields: null },
  external_service: externalService,
};

// The description Kibana pushed, as ServiceNow stores it.
const pushedDescription = `${theCase.description}\n\nAdded by elastic.\nFor more details, view this case in Kibana.\nCase URL: https://kibana.example.com/app/security/cases/mock-id-1`;

const incident = {
  sys_id: '123',
  short_description: 'Renamed in ServiceNow',
  description: pushedDescription,
  state: '6',
  sys_updated_on: '2026-09-30 10:00:00',
  sys_updated_by: 'admin',
};

// Shape returned by connectorMappingsService.find for the case connector.
const connectorMappingsFound = (attributes?: Record<string, unknown>) =>
  ({
    saved_objects: attributes != null ? [{ id: 'mapping-1', attributes }] : [],
    total: attributes != null ? 1 : 0,
    page: 1,
    per_page: 1,
  } as never);

const userActionsResponse = (types: string[]) =>
  [
    { type: UserActionTypes.pushed, payload: { externalService } },
    ...types.map((type) => ({ type, payload: {} })),
  ] as unknown as CaseUserActionsDeprecatedResponse;

describe('sync', () => {
  const casesClient = createCasesClientMock();
  const usageCounter = usageCollectionPluginMock.createSetupContract().createUsageCounter('cases');
  const clientArgs = { ...createCasesClientMockArgs(), usageCounter };
  const { actionsClient, authorization } = clientArgs;
  const { licensingService, userActionService, connectorMappingsService } = clientArgs.services;

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient.cases.get.mockResolvedValue(theCase);
    casesClient.userActions.getAll.mockResolvedValue(userActionsResponse([]));
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    licensingService.isAtLeastEnterprise.mockResolvedValue(true);
    connectorMappingsService.find.mockResolvedValue(connectorMappingsFound());
    actionsClient.execute.mockResolvedValue({ status: 'ok', data: incident, actionId: 'sn-1' });
  });

  it('applies the incident title and status and records a sync user action', async () => {
    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(actionsClient.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'sn-1',
        params: { subAction: 'getIncident', subActionParams: { externalId: '123' } },
      })
    );
    expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith(
      {
        cases: [
          {
            id: theCase.id,
            version: theCase.version,
            title: 'Renamed in ServiceNow',
            status: CaseStatuses.closed,
          },
        ],
      },
      { origin: 'external_sync' }
    );
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.sync,
        payload: {
          sync: {
            connector_name: 'ServiceNow',
            external_id: '123',
            external_title: 'INC01',
            external_url: 'https://sn.example.com/INC01',
            updated_fields: ['title', 'status'],
            conflicted_fields: [],
            external_updated_at: '2026-09-30 10:00:00',
            external_updated_by: 'admin',
          },
        },
        user: clientArgs.user,
        caseId: theCase.id,
        owner: theCase.owner,
      },
    });
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith(
      expect.objectContaining({ counterName: SYNC_CASE_APPLIED_COUNTER })
    );
    // The case is re-read so the response reflects the applied patch.
    expect(casesClient.cases.get).toHaveBeenCalledTimes(2);
  });

  it('keeps fields changed in Kibana since the last push when the strategy is kibana', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      settings: {
        ...theCase.settings,
        externalSync: { autoPush: false, conflictStrategy: 'kibana' },
      },
    });
    casesClient.userActions.getAll.mockResolvedValue(userActionsResponse(['title', 'tags']));

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith(
      { cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }] },
      { origin: 'external_sync' }
    );
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAction: expect.objectContaining({
          payload: {
            sync: expect.objectContaining({
              updated_fields: ['status'],
              conflicted_fields: ['title'],
            }),
          },
        }),
      })
    );
  });

  it('does not treat fields written by a previous sync as Kibana changes', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      settings: {
        ...theCase.settings,
        externalSync: { autoPush: false, conflictStrategy: 'kibana' },
      },
    });
    // push, then a sync that applied `status`, then a user edit of `title`
    casesClient.userActions.getAll.mockResolvedValue(
      userActionsResponse(['status', UserActionTypes.sync, 'title'])
    );

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith(
      { cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }] },
      { origin: 'external_sync' }
    );
  });

  it('skips fields whose direction does not pull from the external system', async () => {
    connectorMappingsService.find.mockResolvedValue(
      connectorMappingsFound({
        externalSyncFields: [
          { field: 'title', direction: 'push' },
          { field: 'status', direction: 'off' },
        ],
      })
    );

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAction: expect.objectContaining({
          payload: { sync: expect.objectContaining({ updated_fields: [], conflicted_fields: [] }) },
        }),
      })
    );
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith(
      expect.objectContaining({ counterName: SYNC_CASE_NO_CHANGES_COUNTER })
    );
  });

  it('applies a per-field conflict rule over the case default', async () => {
    // Case default keeps the external value; the title rule keeps the Kibana value.
    connectorMappingsService.find.mockResolvedValue(
      connectorMappingsFound({
        externalSyncFields: [{ field: 'title', direction: 'both', conflictStrategy: 'kibana' }],
      })
    );
    casesClient.userActions.getAll.mockResolvedValue(userActionsResponse(['title', 'status']));

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith(
      { cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }] },
      { origin: 'external_sync' }
    );
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAction: expect.objectContaining({
          payload: {
            sync: expect.objectContaining({
              updated_fields: ['status'],
              conflicted_fields: ['title'],
            }),
          },
        }),
      })
    );
  });

  it('does not read the user actions when no field keeps the Kibana value', async () => {
    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.userActions.getAll).not.toHaveBeenCalled();
  });

  it('reads the field rules of the case connector', async () => {
    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(connectorMappingsService.find).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ hasReference: { type: 'action', id: 'sn-1' } }),
      })
    );
  });

  it('does not update the case when the incident matches it', async () => {
    actionsClient.execute.mockResolvedValue({
      status: 'ok',
      actionId: 'sn-1',
      data: { ...incident, short_description: theCase.title, state: '1' },
    });

    const result = await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    expect(userActionService.creator.createUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAction: expect.objectContaining({
          payload: { sync: expect.objectContaining({ updated_fields: [], conflicted_fields: [] }) },
        }),
      })
    );
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith(
      expect.objectContaining({ counterName: SYNC_CASE_NO_CHANGES_COUNTER })
    );
    expect(casesClient.cases.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(theCase);
  });

  it('checks authorization before contacting the external system', async () => {
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'Unauthorized'
    );
    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('requires an Enterprise license', async () => {
    licensingService.isAtLeastEnterprise.mockResolvedValue(false);

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'requires an Enterprise license'
    );
    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('rejects a case that was never pushed', async () => {
    casesClient.cases.get.mockResolvedValue({ ...theCase, external_service: null });

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'has not been pushed'
    );
  });

  it('rejects a case whose connector changed after the last push', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      connector: { ...theCase.connector, id: 'sn-2' },
    });

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'connector changed after the last push'
    );
  });

  it('rejects connector types that cannot be synced from', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      connector: { id: 'sn-1', name: 'none', type: ConnectorTypes.none, fields: null },
    });

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'does not support syncing'
    );
  });

  // The connector reported a failure (for example the incident no longer exists or credentials expired).
  it('surfaces a connector error as a failed dependency without touching the case', async () => {
    actionsClient.execute.mockResolvedValue({
      status: 'error',
      actionId: 'sn-1',
      message: 'boom',
      serviceMessage: 'Unable to get incident with id 123',
    });

    await expect(sync({ caseId: theCase.id }, clientArgs, casesClient)).rejects.toThrow(
      'Unable to get incident with id 123'
    );
    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    expect(userActionService.creator.createUserAction).not.toHaveBeenCalled();
  });
});

describe('stripKibanaInformationFromDescription', () => {
  it('removes the footer Kibana appends on push', () => {
    expect(stripKibanaInformationFromDescription(pushedDescription)).toBe(theCase.description);
  });

  it('removes the footer without the case link', () => {
    expect(stripKibanaInformationFromDescription('body\n\nAdded by elastic.')).toBe('body');
  });

  it('leaves a description without a footer untouched', () => {
    expect(stripKibanaInformationFromDescription('body\n\nmore body')).toBe('body\n\nmore body');
  });
});

describe('sync from Jira (tags and comments)', () => {
  const casesClient = createCasesClientMock();
  const usageCounter = usageCollectionPluginMock.createSetupContract().createUsageCounter('cases');
  const clientArgs = { ...createCasesClientMockArgs(), usageCounter };
  const { actionsClient, authorization } = clientArgs;
  const { licensingService, connectorMappingsService } = clientArgs.services;

  const jiraCase: Case = {
    ...theCase,
    connector: { id: 'sn-1', name: 'Jira', type: ConnectorTypes.jira, fields: null },
    tags: ['defacement'],
    comments: [
      {
        id: 'imported-1',
        type: 'comment',
        owner: theCase.owner,
        data: { content: 'Already imported' },
        metadata: { externalSync: { externalId: '20002', connectorName: 'ServiceNow' } },
        created_at: '2026-09-30T00:00:00.000Z',
        created_by: { username: 'elastic', full_name: null, email: null },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
        version: 'v1',
      },
    ],
  };

  const jiraIncident = {
    id: '123',
    key: 'RJ-1',
    summary: theCase.title,
    labels: ['phishing', 'soc-l2'],
    comment: {
      comments: [
        { id: '20001', body: 'Looking into it', author: { displayName: 'Jane Smith' } },
        { id: '20002', body: 'Already imported' },
        { id: '20003', body: 'Pushed from the case\n\nAdded by elastic.' },
      ],
    },
  };

  const rules = (externalSyncFields: unknown) =>
    ({
      saved_objects: [{ id: 'mapping-1', attributes: { externalSyncFields } }],
      total: 1,
      page: 1,
      per_page: 1,
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient.cases.get.mockResolvedValue(jiraCase);
    casesClient.userActions.getAll.mockResolvedValue(userActionsResponse([]));
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    licensingService.isAtLeastEnterprise.mockResolvedValue(true);
    connectorMappingsService.find.mockResolvedValue(rules([]));
    actionsClient.execute.mockResolvedValue({ status: 'ok', data: jiraIncident, actionId: 'sn-1' });
  });

  it('applies the labels as tags when tags pull', async () => {
    connectorMappingsService.find.mockResolvedValue(rules([{ field: 'tags', direction: 'pull' }]));

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith(
      {
        cases: [{ id: theCase.id, version: theCase.version, tags: ['phishing', 'soc-l2'] }],
      },
      { origin: 'external_sync' }
    );
  });

  it('leaves tags alone by default (push only)', async () => {
    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
  });

  it('imports only the external comments that are new and not pushed from Kibana', async () => {
    connectorMappingsService.find.mockResolvedValue(
      rules([{ field: 'comments', direction: 'both' }])
    );

    await sync({ caseId: theCase.id }, clientArgs, casesClient);

    expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
      caseId: theCase.id,
      origin: 'external_sync',
      attachments: [
        {
          type: 'comment',
          owner: theCase.owner,
          data: { content: 'Looking into it' },
          metadata: {
            externalSync: {
              externalId: '20001',
              connectorName: 'ServiceNow',
              actor: { name: 'Jane Smith' },
            },
          },
        },
      ],
    });
    expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAction: expect.objectContaining({
          payload: { sync: expect.objectContaining({ updated_fields: ['comments'] }) },
        }),
      })
    );
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith(
      expect.objectContaining({ counterName: SYNC_CASE_APPLIED_COUNTER })
    );
    // The case is re-read so the response includes the imported comments.
    expect(casesClient.cases.get).toHaveBeenCalledTimes(2);
  });
});

describe('selectCommentsToImport', () => {
  it('returns nothing when the incident carries no comments', () => {
    expect(selectCommentsToImport(theCase, undefined)).toEqual([]);
    expect(selectCommentsToImport(theCase, [])).toEqual([]);
  });

  it('drops empty bodies and bodies the case cannot store', () => {
    expect(
      selectCommentsToImport(theCase, [
        { externalId: '1', body: '   ' },
        { externalId: '2', body: 'a'.repeat(MAX_COMMENT_LENGTH + 1) },
        { externalId: '3', body: 'ok' },
      ])
    ).toEqual([{ externalId: '3', body: 'ok' }]);
  });
});

describe('isPushedFromKibana', () => {
  it('recognises the footer push appends to comments', () => {
    expect(isPushedFromKibana('Hello\n\nAdded by elastic.')).toBe(true);
    expect(isPushedFromKibana('Hello from Jira')).toBe(false);
  });
});

describe('buildSyncPatch', () => {
  const snapshot = { title: theCase.title, description: 'changed', status: CaseStatuses.closed };

  it('ignores missing and unchanged values and reports conflicts', () => {
    expect(
      buildSyncPatch(theCase, snapshot, {
        changedInKibana: new Set(['description']),
        fieldRules: resolveExternalSyncFieldRules(),
        defaultStrategy: 'kibana',
      })
    ).toEqual({
      patch: { status: CaseStatuses.closed },
      updatedFields: ['status'],
      conflictedFields: ['description'],
    });
  });

  it('applies a Kibana-edited field when its strategy keeps the external value', () => {
    expect(
      buildSyncPatch(theCase, snapshot, {
        changedInKibana: new Set(['description']),
        fieldRules: resolveExternalSyncFieldRules(),
        defaultStrategy: 'external',
      })
    ).toEqual({
      patch: { description: 'changed', status: CaseStatuses.closed },
      updatedFields: ['description', 'status'],
      conflictedFields: [],
    });
  });

  it('skips fields that only push', () => {
    expect(
      buildSyncPatch(theCase, snapshot, {
        changedInKibana: new Set(),
        fieldRules: resolveExternalSyncFieldRules([{ field: 'description', direction: 'push' }]),
        defaultStrategy: 'external',
      })
    ).toEqual({
      patch: { status: CaseStatuses.closed },
      updatedFields: ['status'],
      conflictedFields: [],
    });
  });
});
