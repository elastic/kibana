/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { isExternalUiamCredential } from '@kbn/core-security-server';
import type {
  BulkScheduleWorkflowItem,
  WorkflowsServerPluginSetup,
} from '@kbn/workflows-management-plugin/server';
import { createEventLogService } from '../../services/event_log_service/event_log_service.mock';
import { createMockLicenseService } from '../../services/license_service/license_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createMockStorageServiceContract } from '../../services/storage_service/storage_service.mock';
import {
  createActionGroup,
  createActionPolicy,
  createDispatcherPipelineState,
  createWorkflowDetailDto,
} from '../fixtures/test_utils';
import type { ActionGroup, ActionPolicy, DispatchFailure } from '../types';
import { DISPATCH_FAILURE_REASONS } from './constants';
import { DispatchStep } from './dispatch_step';

const toEnvelope = (id: string, secret: string): string =>
  Buffer.from(`${id}:${secret}`).toString('base64');

const ES_ENVELOPE = toEnvelope('es-key-id', 'es-key-secret');
const UIAM_SECRET = 'essu_uiam-secret';
const UIAM_ENVELOPE = toEnvelope('uiam-key-id', UIAM_SECRET);

const createMockWorkflowsManagement = () => {
  const bulkScheduleWorkflow = jest.fn(
    async (items: BulkScheduleWorkflowItem[], _request: KibanaRequest) =>
      items.map((_, index) => ({
        status: 'scheduled' as const,
        workflowExecutionId: `exec-${index}`,
      }))
  );
  const getWorkflowsByIdsForRequests = jest.fn(
    async (lookups: Array<{ ids: string[]; spaceId: string; request: KibanaRequest }>) =>
      lookups.map(({ ids }) => ({
        status: 'fulfilled' as const,
        value: ids.map((id) => createWorkflowDetailDto({ id })),
      }))
  );
  const getClient = jest.fn((request: KibanaRequest) => ({
    bulkScheduleWorkflow: (items: BulkScheduleWorkflowItem[]) =>
      bulkScheduleWorkflow(items, request),
  }));
  const management = {
    getWorkflowsByIdsForRequests,
    getClient,
  } as unknown as WorkflowsServerPluginSetup['management'];

  return { management, bulkScheduleWorkflow, getWorkflowsByIdsForRequests, getClient };
};

describe('DispatchStep API key characterization', () => {
  let wfm: ReturnType<typeof createMockWorkflowsManagement>;

  beforeEach(() => {
    wfm = createMockWorkflowsManagement();
  });

  afterEach(() => jest.clearAllMocks());

  const execute = async (groups: ActionGroup[], policies: ActionPolicy[]) => {
    const { loggerService } = createLoggerService();
    const { eventLogService } = createEventLogService();
    const step = new DispatchStep(
      wfm.management,
      createMockLicenseService(),
      createMockStorageServiceContract(),
      eventLogService
    );
    return step.execute(
      createDispatcherPipelineState({
        dispatch: groups,
        policies: new Map(policies.map((policy) => [policy.id, policy])),
      }),
      loggerService
    );
  };

  const scheduleCalls = () =>
    wfm.bulkScheduleWorkflow.mock.calls.map(([items, request]) => ({
      authorization: request.headers.authorization,
      spaceId: request.spaceId,
      groupIds: items.map(({ inputs }) => (inputs.payload as { id: string }).id),
    }));

  describe('fake request per stored API key form', () => {
    it.each([
      ['an ES envelope', ES_ENVELOPE, `ApiKey ${ES_ENVELOPE}`],
      ['a base64(id:essu_) envelope', UIAM_ENVELOPE, `ApiKey ${UIAM_SECRET}`],
      ['a raw essu_ secret', UIAM_SECRET, `ApiKey ${UIAM_SECRET}`],
      ['an opaque non-base64 value', 'key-a', 'ApiKey key-a'],
    ])(
      'crafts one unmarked fake request for %s and reuses it for lookup and scheduling',
      async (_label, apiKey, authorization) => {
        await execute(
          [createActionGroup({ id: 'g1', policyId: 'p1', spaceId: 'team-a' })],
          [createActionPolicy({ id: 'p1', spaceId: 'team-a', apiKey })]
        );

        expect(wfm.getWorkflowsByIdsForRequests).toHaveBeenCalledTimes(1);
        const [[lookups]] = wfm.getWorkflowsByIdsForRequests.mock.calls;
        expect(lookups).toHaveLength(1);
        const [{ request, ids, spaceId }] = lookups;
        expect({ ids, spaceId }).toEqual({ ids: ['workflow-1'], spaceId: 'team-a' });

        expect(request.headers).toEqual({ authorization });
        expect(request.isFakeRequest).toBe(true);
        expect(request.spaceId).toBe('team-a');
        expect(isExternalUiamCredential(request)).toBe(false);

        expect(wfm.getClient).toHaveBeenCalledTimes(1);
        expect(wfm.getClient.mock.calls[0][0]).toBe(request);
        expect(wfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
        expect(wfm.bulkScheduleWorkflow.mock.calls[0][1]).toBe(request);
      }
    );

    it('marks the fake request for an external Cloud API key', async () => {
      await execute(
        [createActionGroup({ id: 'g1', policyId: 'p1' })],
        [createActionPolicy({ id: 'p1', apiKey: UIAM_SECRET, apiKeyUiamExternal: true })]
      );

      const [[request]] = wfm.getClient.mock.calls;
      expect(request.headers).toEqual({ authorization: `ApiKey ${UIAM_SECRET}` });
      expect(isExternalUiamCredential(request)).toBe(true);
    });
  });

  describe('grouping by stored API key and space', () => {
    it('keys batches on the presented secret, so two forms of the same UIAM secret share a request', async () => {
      await execute(
        [
          createActionGroup({ id: 'g1', policyId: 'p-raw' }),
          createActionGroup({ id: 'g2', policyId: 'p-envelope' }),
        ],
        [
          createActionPolicy({ id: 'p-raw', apiKey: UIAM_SECRET }),
          createActionPolicy({ id: 'p-envelope', apiKey: UIAM_ENVELOPE }),
        ]
      );

      expect(wfm.getClient).toHaveBeenCalledTimes(1);
      expect(scheduleCalls()).toEqual([
        { authorization: `ApiKey ${UIAM_SECRET}`, spaceId: 'default', groupIds: ['g1', 'g2'] },
      ]);
    });

    it('shares one request across policies storing the identical key in the same space', async () => {
      await execute(
        [
          createActionGroup({ id: 'g1', policyId: 'p1' }),
          createActionGroup({ id: 'g2', policyId: 'p2' }),
        ],
        [
          createActionPolicy({ id: 'p1', apiKey: ES_ENVELOPE }),
          createActionPolicy({ id: 'p2', apiKey: ES_ENVELOPE }),
        ]
      );

      expect(wfm.getClient).toHaveBeenCalledTimes(1);
      expect(scheduleCalls()).toEqual([
        { authorization: `ApiKey ${ES_ENVELOPE}`, spaceId: 'default', groupIds: ['g1', 'g2'] },
      ]);
    });

    it('orders batches by first-seen key, then first-seen space within that key', async () => {
      await execute(
        [
          createActionGroup({ id: 'g1', policyId: 'pa', spaceId: 's1' }),
          createActionGroup({ id: 'g2', policyId: 'pb', spaceId: 's1' }),
          createActionGroup({ id: 'g3', policyId: 'pa', spaceId: 's2' }),
          createActionGroup({ id: 'g4', policyId: 'pa', spaceId: 's1' }),
        ],
        [
          createActionPolicy({ id: 'pa', apiKey: ES_ENVELOPE }),
          createActionPolicy({ id: 'pb', apiKey: UIAM_ENVELOPE }),
        ]
      );

      const [[lookups]] = wfm.getWorkflowsByIdsForRequests.mock.calls;
      expect(
        lookups.map(({ ids, spaceId, request }) => ({
          ids,
          spaceId,
          authorization: request.headers.authorization,
          requestSpaceId: request.spaceId,
        }))
      ).toEqual([
        {
          ids: ['workflow-1'],
          spaceId: 's1',
          authorization: `ApiKey ${ES_ENVELOPE}`,
          requestSpaceId: 's1',
        },
        {
          ids: ['workflow-1'],
          spaceId: 's2',
          authorization: `ApiKey ${ES_ENVELOPE}`,
          requestSpaceId: 's2',
        },
        {
          ids: ['workflow-1'],
          spaceId: 's1',
          authorization: `ApiKey ${UIAM_SECRET}`,
          requestSpaceId: 's1',
        },
      ]);
      expect(scheduleCalls()).toEqual([
        { authorization: `ApiKey ${ES_ENVELOPE}`, spaceId: 's1', groupIds: ['g1', 'g4'] },
        { authorization: `ApiKey ${ES_ENVELOPE}`, spaceId: 's2', groupIds: ['g3'] },
        { authorization: `ApiKey ${UIAM_SECRET}`, spaceId: 's1', groupIds: ['g2'] },
      ]);
    });

    it('treats an empty-string API key as missing and crafts no request (current behavior)', async () => {
      const result = await execute(
        [createActionGroup({ id: 'g1', policyId: 'p1' })],
        [createActionPolicy({ id: 'p1', apiKey: '' })]
      );

      const failures: DispatchFailure[] =
        result.type === 'continue' ? [...(result.data?.outcome?.failures ?? [])] : [];
      expect(failures.map(({ reason }) => reason)).toEqual([
        DISPATCH_FAILURE_REASONS.MISSING_API_KEY,
      ]);
      expect(wfm.getWorkflowsByIdsForRequests).not.toHaveBeenCalled();
      expect(wfm.getClient).not.toHaveBeenCalled();
    });
  });
});
