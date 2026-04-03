/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { createTriggerAnalyticsSyncRoute } from './trigger_analytics_sync';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock('../../../cases_analytics', () => ({
  createCasesAnalyticsIndexesForOwnerAndSpace: jest.fn().mockResolvedValue(undefined),
  getIndicesForOwnerAndSpace: jest
    .fn()
    .mockReturnValue(['.cases-analytics.securitysolution-default']),
}));

jest.mock('../../../cases_analytics/data_views', () => ({
  createAnalyticsDataViews: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../cases_analytics/dashboard', () => ({
  provisionAnalyticsDashboard: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../cases_analytics/constants', () => ({
  CAISyncTypes: ['cai_content_sync', 'cai_activity_sync'],
  SYNCHRONIZATION_QUERIES_DICTIONARY: {
    cai_content_sync: jest.fn().mockReturnValue({ match_all: {} }),
    cai_activity_sync: jest.fn().mockReturnValue({ match_all: {} }),
  },
  destinationIndexBySyncType: jest
    .fn()
    .mockReturnValue('.cases-analytics.securitysolution-default'),
  sourceIndexBySyncType: jest.fn().mockReturnValue('.kibana_cases'),
}));

// Mock SavedObjectsClient so we can control the soClient instance created
// inside the handler without touching Kibana internals.
const mockSoClientUpdate = jest.fn();

jest.mock('@kbn/core/server', () => {
  const actual = jest.requireActual('@kbn/core/server');
  return {
    ...actual,
    SavedObjectsClient: jest.fn().mockImplementation(() => ({
      update: mockSoClientUpdate,
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildCompletedTaskStatus = (completed = true) => ({
  completed,
  response: { failures: [], total: 1, updated: 1, deleted: 0, noops: 0, created: 1 },
});

const buildMappingWithScript = (scriptId = 'test-script-id') => ({
  '.cases-analytics.securitysolution-default': {
    mappings: { _meta: { painless_script_id: scriptId } },
  },
});

const buildMappingWithoutScript = () => ({
  '.cases-analytics.securitysolution-default': {
    mappings: { _meta: {} },
  },
});

/** Build the minimal `core` mock the handler needs.
 * Pass `taskManager: null` to simulate task manager being unavailable (undefined). */
function buildCore({
  indicesExist = true,
  taskManager = {} as object | null,
  dataViews = { dataViewsServiceFactory: jest.fn().mockResolvedValue({}) } as object | null,
}: {
  indicesExist?: boolean;
  taskManager?: object | null;
  dataViews?: object | null;
} = {}) {
  const esClient = {
    indices: {
      exists: jest.fn().mockResolvedValue(indicesExist),
      getMapping: jest.fn().mockResolvedValue(buildMappingWithScript()),
    },
    reindex: jest.fn().mockResolvedValue({ task: 'reindex-task-1' }),
    tasks: {
      get: jest.fn().mockResolvedValue(buildCompletedTaskStatus(true)),
    },
  };

  const coreStart = {
    elasticsearch: { client: { asInternalUser: esClient } },
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue({}),
    },
  };

  const pluginsStart = {
    spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('default') } },
    taskManager: taskManager ?? undefined,
    dataViews: dataViews ?? undefined,
  };

  const core = {
    getStartServices: jest.fn().mockResolvedValue([coreStart, pluginsStart]),
  };

  return { core, coreStart, pluginsStart, esClient };
}

/** Build the minimal cases-context + client mock.
 *
 * Default configureGetResult includes `analytics_enabled: true` so happy-path
 * tests work without additional setup.  Override to test disabled/missing state.
 */
function buildCasesContext({
  configureGetResult = [{ id: 'cfg-1', analytics_enabled: true }],
  ensureUpdateAuthorizedError = undefined as Error | undefined,
}: { configureGetResult?: object[]; ensureUpdateAuthorizedError?: Error } = {}) {
  const casesClient = {
    configure: {
      get: jest.fn().mockResolvedValue(configureGetResult),
      ensureUpdateAuthorized: ensureUpdateAuthorizedError
        ? jest.fn().mockRejectedValue(ensureUpdateAuthorizedError)
        : jest.fn().mockResolvedValue(undefined),
    },
  };
  const context = {
    cases: Promise.resolve({ getCasesClient: jest.fn().mockResolvedValue(casesClient) }),
  };
  return { context, casesClient };
}

/** Build a minimal HTTP request mock. */
function buildRequest(owner = 'securitySolution') {
  return { body: { owner } };
}

/** Build a minimal HTTP response mock. */
function buildResponse() {
  return {
    ok: jest.fn(),
    forbidden: jest.fn(),
    notFound: jest.fn(),
    badRequest: jest.fn(),
    customError: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createTriggerAnalyticsSyncRoute — handler', () => {
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Step 1: owner-scoped authorization
  // -------------------------------------------------------------------------

  describe('authorization guard', () => {
    /**
     * FAILURE SCENARIO: No configuration found for this owner/space
     * Symptom: Caller receives HTTP 404 — either no configure SO exists or the user
     *          does not have access to this owner (getAuthorizationFilter filtered it out).
     * Log signature: (none — HTTP 404 response)
     * Trigger: `casesClient.configure.get({ owner: [owner] })` returns []
     * Recovery: Visit Cases > Configure to create a configuration and enable analytics
     */
    it('returns 404 when configure.get returns an empty array (no config or cross-owner caller)', async () => {
      const { context } = buildCasesContext({ configureGetResult: [] });
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error: mocking Kibana platform context/request/response types
      await route.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: expect.stringContaining('No Cases configuration found'),
      });
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('does NOT call core.getStartServices before the authorization check', async () => {
      const { context } = buildCasesContext({ configureGetResult: [] });
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      // getStartServices is called lazily — must NOT fire before auth check passes
      expect(core.getStartServices).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Step 1b: settings-level (write) authorization
  // -------------------------------------------------------------------------

  describe('settings-level authorization guard', () => {
    it('calls ensureUpdateAuthorized with the owner and configure SO id', async () => {
      const { context, casesClient } = buildCasesContext({
        // Explicit id so the assertion below is unambiguous
        configureGetResult: [{ id: 'cfg-so-1', analytics_enabled: true }],
      });
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(casesClient.configure.ensureUpdateAuthorized).toHaveBeenCalledWith(
        'securitySolution',
        'cfg-so-1'
      );
    });

    /**
     * FAILURE SCENARIO: User has Cases:read but not Cases:all — they can call
     * configure.get() but must not be able to trigger an expensive reindex.
     * Symptom: createCaseError wraps the rejection and rethrows.
     * Log signature: route-level error handler catches and creates a CaseError.
     * Trigger: ensureUpdateAuthorized throws a Boom.forbidden (403).
     * Recovery: User must have Cases:all privilege to trigger a manual sync.
     */
    it('propagates the error when ensureUpdateAuthorized rejects (read-only user)', async () => {
      const authError = Object.assign(new Error('Forbidden'), {
        isBoom: true,
        output: { statusCode: 403 },
      });
      const { context } = buildCasesContext({
        // Error is thrown at ensureUpdateAuthorized — analytics_enabled is never checked
        configureGetResult: [{ id: 'cfg-so-1' }],
        ensureUpdateAuthorizedError: authError,
      });
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });

      // The handler wraps unexpected errors via createCaseError and rethrows
      // @ts-expect-error
      await expect(route.handler({ context, request, response })).rejects.toThrow();
      // Reindex must NOT have been triggered for an unauthorized caller
      expect(esClient.reindex).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Step 2: analytics_enabled guard
  // -------------------------------------------------------------------------

  describe('analytics_enabled guard', () => {
    /**
     * FAILURE SCENARIO: Analytics sync triggered for a space/owner where analytics is disabled
     * Symptom: Caller receives HTTP 400 with message "Analytics is not enabled"
     * Log signature: (none — standard 400 response path)
     * Trigger: configure SO has `analytics_enabled: false`
     * Recovery: Enable analytics for the space/owner in Cases > Configure
     */
    it('returns 400 when analytics_enabled is false', async () => {
      const { context } = buildCasesContext({
        configureGetResult: [{ id: 'cfg-1', analytics_enabled: false }],
      });
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: expect.stringContaining('Analytics is not enabled'),
      });
      expect(response.ok).not.toHaveBeenCalled();
    });

    /**
     * FAILURE SCENARIO: Configuration exists but analytics_enabled field is absent
     * Symptom: Caller receives HTTP 400 — absent field treated as disabled
     * Log signature: (none)
     * Trigger: configure SO exists but was created before analytics_enabled was added
     *          (or the field was never explicitly set)
     * Recovery: Enable analytics for the space/owner in Cases > Configure
     */
    it('returns 400 when analytics_enabled field is absent from the configuration', async () => {
      const { context } = buildCasesContext({
        configureGetResult: [{ id: 'cfg-1' }], // no analytics_enabled field
      });
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: expect.stringContaining('Analytics is not enabled'),
      });
    });

    it('runs infrastructure setup when analytics_enabled is true', async () => {
      // Default configureGetResult already has analytics_enabled: true
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(esClient.reindex).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ acknowledged: true, synced_at: expect.any(String) }),
        })
      );
    });

    it('does NOT run infrastructure setup when analytics_enabled guard fails', async () => {
      const { context } = buildCasesContext({
        configureGetResult: [{ id: 'cfg-1', analytics_enabled: false }],
      });
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const { createCasesAnalyticsIndexesForOwnerAndSpace } = jest.requireMock(
        '../../../cases_analytics'
      );

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(createCasesAnalyticsIndexesForOwnerAndSpace).not.toHaveBeenCalled();
      expect(esClient.reindex).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Step 3: index creation gating
  // -------------------------------------------------------------------------

  describe('index creation', () => {
    it('skips index creation when destination indices already exist', async () => {
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore({ indicesExist: true });
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const { createCasesAnalyticsIndexesForOwnerAndSpace } = jest.requireMock(
        '../../../cases_analytics'
      );

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(createCasesAnalyticsIndexesForOwnerAndSpace).not.toHaveBeenCalled();
      expect(esClient.reindex).toHaveBeenCalled();
    });

    it('creates indices when they do not yet exist', async () => {
      const taskManager = { scheduleNow: jest.fn() };
      const { context } = buildCasesContext();
      const { core } = buildCore({ indicesExist: false, taskManager });
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const { createCasesAnalyticsIndexesForOwnerAndSpace } = jest.requireMock(
        '../../../cases_analytics'
      );

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(createCasesAnalyticsIndexesForOwnerAndSpace).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default', owner: 'securitySolution' })
      );
    });

    /**
     * FAILURE SCENARIO: Task manager unavailable during first-time index creation
     * Symptom: Caller receives HTTP 503 — sync cannot proceed without task manager
     * Log signature: (none — HTTP 503 response)
     * Trigger: `pluginsStart.taskManager` is undefined when destination indices do not yet exist
     * Recovery: Ensure task manager is running; retry after Kibana is fully started
     */
    it('returns 503 when indices do not exist and task manager is unavailable', async () => {
      const { context } = buildCasesContext();
      const { core } = buildCore({ indicesExist: false, taskManager: null });
      const response = buildResponse();
      const request = buildRequest('securitySolution');

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: expect.stringContaining('Task manager'),
      });
      expect(response.ok).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Reindex: conflicts: 'proceed' and painless script ID
  // -------------------------------------------------------------------------

  describe('reindex parameters', () => {
    it('passes conflicts: "proceed" to the ES reindex call', async () => {
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(esClient.reindex).toHaveBeenCalledWith(
        expect.objectContaining({ conflicts: 'proceed' })
      );
    });

    it('passes wait_for_completion: false to the ES reindex call', async () => {
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(esClient.reindex).toHaveBeenCalledWith(
        expect.objectContaining({ wait_for_completion: false })
      );
    });

    /**
     * FAILURE SCENARIO: Missing painless script ID in destination index metadata
     * Symptom: Sync silently skips that sync type; caller still receives 200 for the other type
     * Log signature: `[trigger-analytics-sync] No painless script ID found for <index>, skipping sync type <type>`
     * Trigger: `indices.getMapping` returns a mapping without `_meta.painless_script_id`
     * Recovery: Re-run index creation — the script ID is written during index bootstrap
     */
    it('skips reindex and logs a warning when painless_script_id is missing from the mapping', async () => {
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      esClient.indices.getMapping.mockResolvedValue(buildMappingWithoutScript());

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(esClient.reindex).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No painless script ID found')
      );
      // Caller still receives 200 — missing script is non-fatal per sync type
      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ acknowledged: true }) })
      );
    });
  });

  // -------------------------------------------------------------------------
  // analytics_last_sync_at write-back
  // -------------------------------------------------------------------------

  describe('analytics_last_sync_at write-back', () => {
    it('writes analytics_last_sync_at to the configure SO on success', async () => {
      const { context } = buildCasesContext();
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      expect(mockSoClientUpdate).toHaveBeenCalledWith(
        'cases-configure',
        'cfg-1',
        { analytics_last_sync_at: expect.any(String), analytics_sync_status: 'active' },
        expect.any(Object)
      );
    });

    it('returns 200 even when the analytics_last_sync_at write fails (non-fatal)', async () => {
      /**
       * FAILURE SCENARIO: SO update for analytics_last_sync_at fails after the reindex is started
       * Symptom: Caller still receives 200 — data is synced; only the display timestamp update failed
       * Log signature: `[trigger-analytics-sync] Failed to write analytics_last_sync_at: <message>`
       * Trigger: SavedObjects client rejects during the fire-and-forget update
       * Recovery: The timestamp will be refreshed on the next OwnerSyncTask run
       */
      const { context } = buildCasesContext();
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockRejectedValue(new Error('SO update failed'));

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });
      // Flush the fire-and-forget .catch() microtask so the logger.warn assertion is reliable.
      await Promise.resolve();

      // Non-fatal — data is synced; only the timestamp write failed
      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ acknowledged: true }) })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write analytics_last_sync_at'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Successful happy-path response shape
  // -------------------------------------------------------------------------

  describe('successful sync', () => {
    it('returns 200 immediately with acknowledged, synced_at, and task_ids', async () => {
      const { context } = buildCasesContext();
      const { core } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const before = new Date().toISOString();
      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });
      const after = new Date().toISOString();

      expect(response.ok).toHaveBeenCalledTimes(1);
      const [[{ body }]] = (response.ok as jest.Mock).mock.calls;
      expect(body.acknowledged).toBe(true);
      expect(body.synced_at >= before).toBe(true);
      expect(body.synced_at <= after).toBe(true);
      // task_ids is an array of started reindex task IDs (non-null entries from CAISyncTypes)
      expect(Array.isArray(body.task_ids)).toBe(true);
    });

    it('does NOT call esClient.tasks.get — no in-handler polling', async () => {
      const { context } = buildCasesContext();
      const { core, esClient } = buildCore();
      const response = buildResponse();
      const request = buildRequest('securitySolution');
      mockSoClientUpdate.mockResolvedValue({});

      const route = createTriggerAnalyticsSyncRoute({
        core: core as any,
        logger,
        isServerless: false,
      });
      // @ts-expect-error
      await route.handler({ context, request, response });

      // The handler must NOT poll ES task status — doing so blocks the HTTP
      // connection for up to 5 minutes and hits proxy read-timeout limits.
      expect(esClient.tasks.get).not.toHaveBeenCalled();
    });
  });
});
