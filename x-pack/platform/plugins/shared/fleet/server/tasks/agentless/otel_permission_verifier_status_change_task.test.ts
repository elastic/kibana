/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../common/constants';

import {
  registerStatusChangeTask,
  scheduleStatusChangeTask,
} from './otel_permission_verifier_status_change_task';

const mockSoClient = {
  bulkUpdate: jest.fn(),
} as any;

const mockEsClient = {
  search: jest.fn(),
} as any;

/**
 * Logical overrides for {@link makeHit}. Each key maps to a flat-dotted OTel
 * attribute key under `_source.attributes` (or `_source.resource.attributes` for
 * connector identity). Reflects what the production aggregator reads.
 */
interface MakeHitOverrides {
  identity_federation_id?: string;
  policyId?: string;
  policyName?: string;
  policyTemplate?: string | undefined;
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
  packagePolicyId?: string;
  permissionAction?: string;
  permissionStatus?: 'granted' | 'denied' | 'error' | 'skipped';
  permissionRequired?: boolean;
  errorCode?: string;
  verifiedAt?: string;
  /** Body text — mapped to PermissionResult.message in the row-expand "Message" column. */
  bodyText?: string;
  timestamp?: string;
}

/**
 * Build one fake top_hits source document representing a single permission check.
 * The shape matches what the verifier OTel receiver actually emits:
 *   - `attributes` carries per-record dotted keys (e.g. `'policy.id'`)
 *   - `resource.attributes` carries per-emitter dotted keys (e.g. `'identity_federation.id'`)
 *   - `body.text` carries the human-readable summary line
 */
const makeHit = (overrides: MakeHitOverrides = {}) => ({
  _source: {
    '@timestamp': overrides.timestamp ?? '2026-05-06T10:00:00.000Z',
    attributes: {
      'policy.id': overrides.policyId ?? 'agent-policy-1',
      ...(overrides.policyName !== undefined ? { 'policy.name': overrides.policyName } : {}),
      // `in` check (not `??`) so callers can explicitly set `policyTemplate: undefined`
      // to simulate a malformed log doc (missing-field) for the bucket-skip test.
      policy_template: 'policyTemplate' in overrides ? overrides.policyTemplate : 'cloudtrail',
      'package.name': overrides.packageName ?? 'aws',
      ...(overrides.packageTitle !== undefined ? { 'package.title': overrides.packageTitle } : {}),
      ...(overrides.packageVersion !== undefined
        ? { 'package.version': overrides.packageVersion }
        : {}),
      'package_policy.id': overrides.packagePolicyId ?? 'pp-cloudtrail',
      'permission.action': overrides.permissionAction ?? 'cloudtrail:LookupEvents',
      'permission.status': overrides.permissionStatus ?? 'granted',
      'permission.required': overrides.permissionRequired ?? true,
      ...(overrides.errorCode !== undefined
        ? { 'permission.error_code': overrides.errorCode }
        : {}),
      'verification.verified_at': overrides.verifiedAt ?? '2026-05-06T10:00:00.000Z',
    },
    resource: {
      attributes: {
        'identity_federation.id': overrides.identity_federation_id ?? 'cc-1',
      },
    },
    ...(overrides.bodyText !== undefined ? { body: { text: overrides.bodyText } } : {}),
  },
});

/**
 * Build one fake inner package-policy bucket (the leaf of the nested-terms agg).
 * Production no longer uses a `latest_verified_at` sub-agg — the "latest run"
 * is determined from the first hit's `verification.verified_at` value, sorted
 * by `@timestamp` desc.
 */
const makePpBucket = (packagePolicyId: string, hits: any[]) => ({
  key: packagePolicyId,
  doc_count: hits.length,
  recent_permission_docs: { hits: { hits } },
});

/**
 * Build one fake outer connector bucket containing one or more package-policy buckets.
 */
const makeConnectorBucket = (
  connectorId: string,
  ppBuckets: ReturnType<typeof makePpBucket>[],
  ppOverflow = 0
) => ({
  key: connectorId,
  doc_count: ppBuckets.reduce((acc, b) => acc + b.doc_count, 0),
  by_package_policy: {
    sum_other_doc_count: ppOverflow,
    buckets: ppBuckets,
  },
});

const makeSearchResponse = (
  connectorBuckets: ReturnType<typeof makeConnectorBucket>[],
  connectorOverflow = 0
) => ({
  aggregations: {
    by_connector: {
      sum_other_doc_count: connectorOverflow,
      buckets: connectorBuckets,
    },
  },
});

/**
 * Convenience: build a connector bucket containing a single package-policy bucket.
 * Used by tests where each connector has only one package policy. Tests that exercise
 * multiple package policies per connector should call makeConnectorBucket directly with
 * an array of makePpBucket entries.
 */
const makeBucket = (connectorId: string, packagePolicyId: string, hits: any[]) =>
  makeConnectorBucket(connectorId, [makePpBucket(packagePolicyId, hits)]);

describe('otel_permission_verifier_status_change_task', () => {
  const logger = loggingSystemMock.createLogger();

  const createTaskRunner = (abortCtrl?: AbortController) => {
    const taskManager = taskManagerMock.createSetup();
    registerStatusChangeTask(taskManager);
    const registeredDef =
      taskManager.registerTaskDefinitions.mock.calls[0][0][
        'fleet:otel_permission_verifier_status_change'
      ];
    return registeredDef.createTaskRunner({
      taskInstance: { state: {} } as any,
      abortController: abortCtrl ?? new AbortController(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSoClient.bulkUpdate.mockReset();
    mockEsClient.search.mockReset();

    const mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);

    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
      .mockReturnValue(mockSoClient);
    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(mockEsClient);
    jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
      enableOTelVerifier: true,
    } as any);
  });

  describe('registerStatusChangeTask', () => {
    it('registers the task definition with the expected type and timeout', () => {
      const taskManager = taskManagerMock.createSetup();
      registerStatusChangeTask(taskManager);
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          'fleet:otel_permission_verifier_status_change': expect.objectContaining({
            title: 'OTel Permission Verifier Status Change Task',
            timeout: '5m',
          }),
        })
      );
    });
  });

  describe('scheduleStatusChangeTask', () => {
    it('schedules the task with the expected interval', async () => {
      const taskManager = taskManagerMock.createStart();
      await scheduleStatusChangeTask(taskManager);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
        id: 'fleet:otel_permission_verifier_status_change:1.0.0',
        taskType: 'fleet:otel_permission_verifier_status_change',
        schedule: { interval: '5m' },
        state: {},
        params: {},
      });
    });

    it('logs an error when scheduling fails', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.ensureScheduled.mockRejectedValueOnce(new Error('schedule failed'));
      await scheduleStatusChangeTask(taskManager);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error scheduling status change task'),
        expect.anything()
      );
    });
  });

  describe('runStatusChangeTask (via task runner)', () => {
    let taskRunner: ReturnType<typeof createTaskRunner>;

    beforeEach(() => {
      taskRunner = createTaskRunner();
    });

    it('skips when enableOTelVerifier is disabled', async () => {
      jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
        enableOTelVerifier: false,
      } as any);

      await taskRunner.run();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('OTel verifier is disabled')
      );
      expect(mockEsClient.search).not.toHaveBeenCalled();
      expect(mockSoClient.bulkUpdate).not.toHaveBeenCalled();
    });

    it('no-ops when there are no verifier logs', async () => {
      mockEsClient.search.mockResolvedValueOnce(makeSearchResponse([]));
      await taskRunner.run();
      expect(mockSoClient.bulkUpdate).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No verifier logs to aggregate')
      );
    });

    it('writes one summary per (connector, package_policy) bucket', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([makeBucket('cc-1', 'pp-cloudtrail', [makeHit()])])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      expect(mockSoClient.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          id: 'cc-1',
          attributes: expect.objectContaining({
            verification_permissions: expect.arrayContaining([
              expect.objectContaining({
                package_policy_id: 'pp-cloudtrail',
                policy_id: 'agent-policy-1',
                policy_template: 'cloudtrail',
                package_name: 'aws',
                last_verified_at: '2026-05-06T10:00:00.000Z',
                permissions: [
                  expect.objectContaining({
                    action: 'cloudtrail:LookupEvents',
                    status: 'verified',
                    required: true,
                  }),
                ],
              }),
            ]),
          }),
        }),
      ]);
    });

    it('groups multiple package_policy buckets under one connector', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeConnectorBucket('cc-1', [
            makePpBucket('pp-cloudtrail', [
              makeHit({ packagePolicyId: 'pp-cloudtrail', policyTemplate: 'cloudtrail' }),
            ]),
            makePpBucket('pp-guardduty', [
              makeHit({
                packagePolicyId: 'pp-guardduty',
                policyTemplate: 'guardduty',
                permissionAction: 'guardduty:GetFindings',
                permissionStatus: 'denied',
                permissionRequired: true,
              }),
            ]),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      expect(mockSoClient.bulkUpdate).toHaveBeenCalledTimes(1);
      const call = mockSoClient.bulkUpdate.mock.calls[0][0] as any[];
      expect(call).toHaveLength(1);
      expect(call[0].id).toBe('cc-1');
      expect(call[0].attributes.verification_permissions).toHaveLength(2);
      expect(
        call[0].attributes.verification_permissions.map((s: any) => s.package_policy_id)
      ).toEqual(['pp-cloudtrail', 'pp-guardduty']);
    });

    it('produces separate updates for separate connectors', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeBucket('cc-1', 'pp-1', [makeHit({ identity_federation_id: 'cc-1' })]),
          makeBucket('cc-2', 'pp-2', [
            makeHit({ identity_federation_id: 'cc-2', packagePolicyId: 'pp-2' }),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          { id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE },
          { id: 'cc-2', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE },
        ],
      });

      await taskRunner.run();

      const call = mockSoClient.bulkUpdate.mock.calls[0][0] as any[];
      expect(call.map((u) => u.id).sort()).toEqual(['cc-1', 'cc-2']);
    });

    describe('permission status mapping', () => {
      it.each([
        { raw: 'granted', required: true, expected: 'verified' },
        { raw: 'granted', required: false, expected: 'verified' },
        { raw: 'denied', required: true, expected: 'denied' },
        { raw: 'denied', required: false, expected: 'skipped' },
        { raw: 'error', required: true, expected: 'error' },
        { raw: 'error', required: false, expected: 'error' },
        { raw: 'skipped', required: true, expected: 'skipped' },
        { raw: 'skipped', required: false, expected: 'skipped' },
      ])('maps raw=$raw required=$required → $expected', async ({ raw, required, expected }) => {
        mockEsClient.search.mockResolvedValueOnce(
          makeSearchResponse([
            makeBucket('cc-1', 'pp-1', [
              makeHit({
                permissionAction: 'svc:DoThing',
                permissionStatus: raw as any,
                permissionRequired: required,
              }),
            ]),
          ])
        );
        mockSoClient.bulkUpdate.mockResolvedValueOnce({
          saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
        });

        await taskRunner.run();

        const call = mockSoClient.bulkUpdate.mock.calls[0][0] as any[];
        const summary = call[0].attributes.verification_permissions[0];
        expect(summary.permissions[0].status).toBe(expected);
        expect(summary.permissions[0].required).toBe(required);
      });
    });

    it('filters out hits older than the latest verification run', async () => {
      const latestRun = '2026-05-06T10:00:00.000Z';
      const olderRun = '2026-05-06T09:00:00.000Z';

      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeBucket('cc-1', 'pp-1', [
            makeHit({
              verifiedAt: latestRun,
              permissionAction: 'svc:NewAction',
              permissionStatus: 'granted',
              permissionRequired: true,
            }),
            makeHit({
              verifiedAt: olderRun,
              permissionAction: 'svc:OldAction',
              permissionStatus: 'granted',
              permissionRequired: true,
            }),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      const summary = (mockSoClient.bulkUpdate.mock.calls[0][0] as any[])[0].attributes
        .verification_permissions[0];
      expect(summary.permissions).toHaveLength(1);
      expect(summary.permissions[0].action).toBe('svc:NewAction');
      expect(summary.last_verified_at).toBe(latestRun);
    });

    it('preserves error_code and message (from body.text) when present', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeBucket('cc-1', 'pp-1', [
            makeHit({
              permissionAction: 's3:GetObject',
              permissionStatus: 'denied',
              permissionRequired: true,
              errorCode: 'AccessDenied',
              bodyText: 'Permission check: s3:GetObject - error',
            }),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      const summary = (mockSoClient.bulkUpdate.mock.calls[0][0] as any[])[0].attributes
        .verification_permissions[0];
      expect(summary.permissions[0]).toMatchObject({
        action: 's3:GetObject',
        status: 'denied',
        error_code: 'AccessDenied',
        message: 'Permission check: s3:GetObject - error',
      });
    });

    it('runs the aggregation in a single ES request (no pagination)', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeBucket('cc-1', 'pp-1', [makeHit()]),
          makeBucket('cc-2', 'pp-2', [
            makeHit({ identity_federation_id: 'cc-2', packagePolicyId: 'pp-2' }),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          { id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE },
          { id: 'cc-2', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE },
        ],
      });

      await taskRunner.run();

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    });

    it('logs a warning when the package-policy terms agg is truncated for a connector', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          makeConnectorBucket('cc-1', [makePpBucket('pp-1', [makeHit()])], /* ppOverflow */ 7),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-1', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Package-policy terms agg truncated for connector=cc-1: 7 doc(s)')
      );
    });

    it('writes all summaries in a single bulkUpdate call (no batching)', async () => {
      // 75 connectors all go through one bulkUpdate — realistic deployments are
      // well within Kibana's bulk-update capacity; batching would add complexity
      // without any operational benefit.
      const buckets = Array.from({ length: 75 }, (_, i) =>
        makeBucket(`cc-${i}`, `pp-${i}`, [
          makeHit({ identity_federation_id: `cc-${i}`, packagePolicyId: `pp-${i}` }),
        ])
      );
      mockEsClient.search.mockResolvedValueOnce(makeSearchResponse(buckets));
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: Array.from({ length: 75 }, (_, i) => ({
          id: `cc-${i}`,
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        })),
      });

      await taskRunner.run();

      expect(mockSoClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect((mockSoClient.bulkUpdate.mock.calls[0][0] as any[]).length).toBe(75);
    });

    it('reports all updates as failed and logs error when bulkUpdate rejects', async () => {
      const buckets = Array.from({ length: 10 }, (_, i) =>
        makeBucket(`cc-${i}`, `pp-${i}`, [
          makeHit({ identity_federation_id: `cc-${i}`, packagePolicyId: `pp-${i}` }),
        ])
      );
      mockEsClient.search.mockResolvedValueOnce(makeSearchResponse(buckets));
      mockSoClient.bulkUpdate.mockRejectedValueOnce(new Error('bulk update rejected'));

      await taskRunner.run();

      expect(mockSoClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Bulk update failed'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated 0 connector(s); 10 failed')
      );
    });

    it('logs a warning per per-doc update failure inside a successful batch', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([makeBucket('cc-1', 'pp-1', [makeHit()])])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'cc-1',
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            error: { error: 'NotFound', message: 'connector deleted', statusCode: 404 },
          },
        ],
      });

      await taskRunner.run();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Per-doc update failed for connector cc-1')
      );
    });

    it('skips malformed buckets (missing required fields) without crashing', async () => {
      mockEsClient.search.mockResolvedValueOnce(
        makeSearchResponse([
          // Bucket with hit missing policy_template
          makeBucket('cc-1', 'pp-bad', [makeHit({ policyTemplate: undefined })]),
          // Healthy bucket
          makeBucket('cc-2', 'pp-good', [
            makeHit({ identity_federation_id: 'cc-2', packagePolicyId: 'pp-good' }),
          ]),
        ])
      );
      mockSoClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [{ id: 'cc-2', type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE }],
      });

      await taskRunner.run();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping malformed bucket')
      );
      const call = mockSoClient.bulkUpdate.mock.calls[0][0] as any[];
      // Only cc-2 made it through
      expect(call).toHaveLength(1);
      expect(call[0].id).toBe('cc-2');
    });

    it('bails when aborted', async () => {
      const abortCtrl = new AbortController();
      abortCtrl.abort();
      const runner = createTaskRunner(abortCtrl);

      // search is called inside the try; throwIfAborted fires first and short-circuits.
      await runner.run();

      expect(mockEsClient.search).not.toHaveBeenCalled();
      expect(mockSoClient.bulkUpdate).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Task was aborted'));
    });

    it('returns task state for reschedule', async () => {
      mockEsClient.search.mockResolvedValueOnce(makeSearchResponse([]));
      const result = await taskRunner.run();
      expect(result).toEqual({ state: {} });
    });
  });
});
