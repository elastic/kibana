/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { createActionHandler } from './create_action_handler';
import { buildQueries } from './create_queries';
import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { getInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { packSavedObjectType } from '../../../common/types';
import { PACK_LOOKUP_FAILED, PACK_NOT_FOUND } from '../../../common/translations/errors';

jest.mock('./create_queries', () => ({
  ...jest.requireActual('./create_queries'),
  buildQueries: jest.fn(),
}));
jest.mock('../../lib/parse_agent_groups');
jest.mock('../../utils/get_internal_saved_object_client');

const mockedBuildQueries = buildQueries as jest.MockedFunction<typeof buildQueries>;
const mockedParseAgentSelection = parseAgentSelection as jest.MockedFunction<
  typeof parseAgentSelection
>;
const mockedGetInternalSOClient = getInternalSavedObjectsClientForSpaceId as jest.MockedFunction<
  typeof getInternalSavedObjectsClientForSpaceId
>;

const TEST_AGENT = 'a1';
const QUERY_ACTION_ID = 'query-action-uuid';

const buildOsqueryContext = ({
  bulkCreate = jest.fn().mockResolvedValue(undefined),
  indicesExists = jest.fn().mockResolvedValue(true),
  bulk = jest.fn().mockResolvedValue({ errors: false, items: [] }),
  reportEvent = jest.fn(),
}: {
  bulkCreate?: jest.Mock;
  indicesExists?: jest.Mock;
  bulk?: jest.Mock;
  reportEvent?: jest.Mock;
} = {}) => {
  const esClient = {
    indices: { exists: indicesExists },
    bulk,
  };

  const context = {
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: { client: { asInternalUser: esClient } },
      },
    ]),
    service: {
      getFleetActionsClient: () => ({ bulkCreate }),
    },
    telemetryEventsSender: { reportEvent },
  } as unknown as OsqueryAppContext;

  return { context, bulkCreate, bulk, indicesExists, reportEvent };
};

describe('createActionHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetInternalSOClient.mockReturnValue({} as ReturnType<typeof mockedGetInternalSOClient>);
    mockedParseAgentSelection.mockResolvedValue([TEST_AGENT]);
    mockedBuildQueries.mockResolvedValue([
      {
        action_id: QUERY_ACTION_ID,
        id: 'q1',
        query: 'SELECT * FROM os_version;',
        agents: [TEST_AGENT],
      } as unknown as Awaited<ReturnType<typeof mockedBuildQueries>>[number],
    ]);
  });

  it('writes the originating space_id on each Fleet action document', async () => {
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    const [actions] = bulkCreate.mock.calls[0];
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action_id: QUERY_ACTION_ID,
      input_type: 'osquery',
      space_id: 'production',
    });
  });

  it('falls back to the default space id when no space is provided', async () => {
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      { dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } } }
    );

    const [actions] = bulkCreate.mock.calls[0];
    expect(actions[0].space_id).toBe('default');
  });

  it('writes space_id on the osquery action document and the Fleet action with the same space', async () => {
    const { context, bulkCreate, bulk } = buildOsqueryContext();

    const result = await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(result.response.space_id).toBe('production');
    const [fleetActions] = bulkCreate.mock.calls[0];
    expect(fleetActions[0].space_id).toBe('production');
    expect(bulk).toHaveBeenCalledTimes(1);
  });

  it('throws when the osquery action document fails to index', async () => {
    const bulk = jest.fn().mockResolvedValue({
      errors: true,
      items: [{ index: { status: 429, error: { type: 'es_rejected', reason: 'rejected' } } }],
    });
    const { context, reportEvent } = buildOsqueryContext({ bulk });

    await expect(
      createActionHandler(
        context,
        { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      )
    ).rejects.toThrow(/Failed to write osquery action document .*: rejected/);
    expect(reportEvent).not.toHaveBeenCalled();
  });

  // The top-level space_id above is dropped by Fleet Server before it reaches the
  // agent. `data` is the only field with opaque passthrough, and osquerybeat copies
  // it onto result / action-response documents as `action_data`, so this is what
  // actually makes results visible in a named space.
  it('also writes space_id inside the action data blob for a named space', async () => {
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    const [actions] = bulkCreate.mock.calls[0];
    expect(actions[0].data).toMatchObject({ space_id: 'production' });
  });

  it('writes space_id inside the action data blob in the default space', async () => {
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      { dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } } }
    );

    const [actions] = bulkCreate.mock.calls[0];
    expect(actions[0].data.space_id).toBe('default');
  });

  it('preserves the existing action data fields when adding space_id', async () => {
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    const [actions] = bulkCreate.mock.calls[0];
    expect(actions[0].data).toMatchObject({
      id: 'q1',
      query: 'SELECT * FROM os_version;',
    });
  });

  it('throws when no agents are selected', async () => {
    mockedParseAgentSelection.mockResolvedValueOnce([]);
    const { context, bulkCreate } = buildOsqueryContext();

    await expect(
      createActionHandler(
        context,
        { query: 'SELECT * FROM os_version;', agent_ids: [] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      )
    ).rejects.toThrow('No agents found for selection');

    expect(bulkCreate).not.toHaveBeenCalled();
  });

  it('does not create Fleet actions when an error is propagated (e.g. license failure)', async () => {
    const { context, bulkCreate, reportEvent } = buildOsqueryContext();

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        error: 'license error',
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(bulkCreate).not.toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('skips the osquery action bulk write when the actions index template is missing', async () => {
    const { context, bulkCreate, bulk } = buildOsqueryContext({
      indicesExists: jest.fn().mockResolvedValue(false),
    });

    await createActionHandler(
      context,
      { query: 'SELECT * FROM os_version;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('does not dispatch anything when the referenced pack cannot be read (live_query)', async () => {
    mockedGetInternalSOClient.mockReturnValue({
      get: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(packSavedObjectType, 'missing-pack')
        ),
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    const { context, bulkCreate, bulk, reportEvent } = buildOsqueryContext();

    await expect(
      createActionHandler(
        context,
        { pack_id: 'missing-pack', query: 'SELECT 42 AS custom;', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: {
            entryPoint: 'live_query',
            source: { kind: 'pack', packSavedObjectId: 'missing-pack' },
          },
        }
      )
    ).rejects.toThrow();

    expect(bulkCreate).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('records an error on the action instead of throwing when rule_run and the pack is gone', async () => {
    mockedGetInternalSOClient.mockReturnValue({
      get: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(packSavedObjectType, 'missing-pack')
        ),
      find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
      resolve: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(packSavedObjectType, 'missing-pack')
        ),
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    // Use actual buildQueries so the unresolved source produces an error row
    mockedBuildQueries.mockImplementation(jest.requireActual('./create_queries').buildQueries);
    const { context, bulkCreate, bulk } = buildOsqueryContext();

    const result = await createActionHandler(
      context,
      { pack_id: 'missing-pack', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: {
          entryPoint: 'rule_run',
          preflight: undefined,
        },
      }
    );

    expect(result.fleetActionsCount).toBe(0);
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(bulk).toHaveBeenCalledTimes(1);
    expect(result.response.queries).toEqual([
      expect.objectContaining({ id: 'missing-pack', error: PACK_NOT_FOUND }),
    ]);
  });

  it('records a pack lookup-failure error when rule_run and pack get throws a generic SO error', async () => {
    mockedGetInternalSOClient.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('elasticsearch unavailable')),
      find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
      resolve: jest.fn().mockRejectedValue(new Error('elasticsearch unavailable')),
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    // Use actual buildQueries so the unresolved source produces an error row
    mockedBuildQueries.mockImplementation(jest.requireActual('./create_queries').buildQueries);
    const { context, bulkCreate, bulk } = buildOsqueryContext();

    const result = await createActionHandler(
      context,
      { pack_id: 'missing-pack', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: {
          entryPoint: 'rule_run',
          preflight: undefined,
        },
      }
    );

    expect(result.fleetActionsCount).toBe(0);
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(bulk).toHaveBeenCalledTimes(1);
    expect(result.response.queries).toEqual([
      expect.objectContaining({ id: 'missing-pack', error: PACK_LOOKUP_FAILED }),
    ]);
    expect(result.response.queries[0].error).not.toBe(PACK_NOT_FOUND);
  });

  it('rethrows non-404 pack errors when entry point is live_query', async () => {
    mockedGetInternalSOClient.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('elasticsearch unavailable')),
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    const { context, bulkCreate, bulk, reportEvent } = buildOsqueryContext();

    await expect(
      createActionHandler(
        context,
        { pack_id: 'missing-pack', query: 'SELECT 42 AS custom;', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: {
            entryPoint: 'live_query',
            source: { kind: 'pack', packSavedObjectId: 'missing-pack' },
          },
        }
      )
    ).rejects.toThrow('elasticsearch unavailable');

    expect(bulkCreate).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('passes saved_query dispatch source to buildQueries', async () => {
    const { context } = buildOsqueryContext();
    const storedQuery = { savedObjectId: 'sq-so', query: 'select 1;' };

    await createActionHandler(
      context,
      { saved_query_id: 'sq-1', query: 'select 42 as custom;', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: {
          entryPoint: 'live_query',
          source: { kind: 'saved_query', savedQueryId: 'sq-1', stored: storedQuery },
        },
      }
    );

    expect(mockedBuildQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { kind: 'saved_query', savedQueryId: 'sq-1', stored: storedQuery },
      })
    );
  });

  it('dispatches pack SO SQL to Fleet even when the caller posted a different queries[]', async () => {
    const storedPackQuery = 'select * from processes;';
    const callerQuery = 'select 42 as custom;';
    const get = jest.fn().mockResolvedValue({
      attributes: {
        name: 'pack',
        queries: [{ id: 'processes', name: 'processes', query: storedPackQuery }],
      },
      references: [],
    });
    mockedGetInternalSOClient.mockReturnValue({
      get,
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    // Use actual buildQueries for this test to verify the SO content is dispatched
    mockedBuildQueries.mockImplementation(jest.requireActual('./create_queries').buildQueries);
    const { context, bulkCreate } = buildOsqueryContext();

    await createActionHandler(
      context,
      {
        pack_id: 'pack-1',
        queries: [{ id: 'processes', query: callerQuery }],
        agent_ids: [TEST_AGENT],
      } as unknown as Parameters<typeof createActionHandler>[1],
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    const [actions] = bulkCreate.mock.calls[0];
    expect(actions).toHaveLength(1);
    expect(actions[0].data.query).toBe(storedPackQuery);
    expect(actions[0].data.query).not.toBe(callerQuery);
  });

  it('looks up a padded pack_id using the trimmed id', async () => {
    const get = jest.fn().mockResolvedValue({
      attributes: { name: 'pack', queries: [] },
      references: [],
    });
    mockedGetInternalSOClient.mockReturnValue({
      get,
    } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    const { context } = buildOsqueryContext();

    await createActionHandler(
      context,
      { pack_id: '  pack-1  ', agent_ids: [TEST_AGENT] },
      {
        space: { id: 'production' },
        dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
      }
    );

    expect(get).toHaveBeenCalledWith(packSavedObjectType, 'pack-1');
  });

  describe('pack_id path', () => {
    const mockPackGet = (attributes: {
      name?: string;
      queries: Array<Record<string, unknown>>;
      min_osquery_version?: string | null;
      platform?: string | null;
      result_type?: string | null;
    }) => {
      mockedGetInternalSOClient.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          attributes: { name: 'test-pack', ...attributes },
          references: [],
        }),
      } as unknown as ReturnType<typeof mockedGetInternalSOClient>);
    };

    beforeEach(() => {
      // Use actual buildQueries for pack tests
      mockedBuildQueries.mockImplementation(jest.requireActual('./create_queries').buildQueries);
    });

    it('dispatches only enabled queries from a pack', async () => {
      mockPackGet({
        queries: [
          { id: 'enabled-q', name: 'enabled-q', query: 'SELECT 1;' },
          { id: 'disabled-q', name: 'disabled-q', query: 'SELECT 2;', enabled: false },
        ],
      });
      const { context, bulkCreate } = buildOsqueryContext();

      const result = await createActionHandler(
        context,
        { pack_id: 'pack-1', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      );

      expect(result.response.queries).toHaveLength(1);
      expect(result.response.queries[0]).toMatchObject({ id: 'enabled-q', query: 'SELECT 1;' });
      const [fleetActions] = bulkCreate.mock.calls[0];
      expect(fleetActions).toHaveLength(1);
      expect(fleetActions[0].data.id).toBe('enabled-q');
    });

    it('applies pack-level version and platform to inheriting queries', async () => {
      mockPackGet({
        min_osquery_version: '5.10.0',
        platform: 'linux',
        result_type: 'differential',
        queries: [{ id: 'q1', name: 'q1', query: 'SELECT 1;' }],
      });
      const { context, bulkCreate } = buildOsqueryContext();

      await createActionHandler(
        context,
        { pack_id: 'pack-1', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      );

      const [fleetActions] = bulkCreate.mock.calls[0];
      expect(fleetActions[0].data).toMatchObject({
        id: 'q1',
        query: 'SELECT 1;',
        version: '5.10.0',
        platform: 'linux',
      });
      expect(fleetActions[0].data).not.toHaveProperty('result_type');
      expect(fleetActions[0].data).not.toHaveProperty('snapshot');
      expect(fleetActions[0].data).not.toHaveProperty('removed');
    });

    it('lets a per-query version and platform win over pack defaults', async () => {
      mockPackGet({
        min_osquery_version: '5.10.0',
        platform: 'linux',
        queries: [
          {
            id: 'q1',
            name: 'q1',
            query: 'SELECT 1;',
            version: '5.12.0',
            platform: 'windows',
          },
        ],
      });
      const { context, bulkCreate } = buildOsqueryContext();

      await createActionHandler(
        context,
        { pack_id: 'pack-1', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      );

      const [fleetActions] = bulkCreate.mock.calls[0];
      expect(fleetActions[0].data).toMatchObject({
        version: '5.12.0',
        platform: 'windows',
      });
    });

    it('treats an all-OS per-query platform as inherit of the pack default', async () => {
      mockPackGet({
        platform: 'linux',
        queries: [
          {
            id: 'q1',
            name: 'q1',
            query: 'SELECT 1;',
            platform: 'linux,darwin,windows',
          },
        ],
      });
      const { context, bulkCreate } = buildOsqueryContext();

      await createActionHandler(
        context,
        { pack_id: 'pack-1', agent_ids: [TEST_AGENT] },
        {
          space: { id: 'production' },
          dispatch: { entryPoint: 'live_query', source: { kind: 'caller' } },
        }
      );

      const [fleetActions] = bulkCreate.mock.calls[0];
      expect(fleetActions[0].data.platform).toBe('linux');
    });
  });
});
