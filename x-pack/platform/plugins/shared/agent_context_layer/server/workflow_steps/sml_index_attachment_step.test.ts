/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { SmlIndexAttachmentInputSchema } from '../../common/workflow_steps/sml_index_attachment_step';
import { apiPrivileges } from '../../common/features';
import type { AgentContextLayerPluginStart } from '../types';
import { createContextEngineAddEntryStepDefinition } from './sml_index_attachment_step';
import { createSmlIndexer } from '../services/sml/sml_indexer';
import { createSmlTypeRegistry } from '../services/sml/sml_type_registry';
import { kibanaSavedObjectPermissions } from '../services/sml/permissions/kibana_saved_object';
import type { SmlTypeDefinition } from '../services/sml/types';
// Imported as a namespace so we can spy on `createSmlStorage` without
// adding a `__mock__` shim. `jest.spyOn(target, method)` needs a
// concrete object reference, which is what the `* as` form gives us.
import * as smlStorage from '../services/sml/sml_storage';

const buildStartContract = (): jest.Mocked<AgentContextLayerPluginStart> => ({
  search: jest.fn(),
  getDocuments: jest.fn(),
  // Default: treat any type as registered. Individual tests can override.
  getTypeDefinition: jest.fn().mockImplementation((id: string) => ({ id } as any)),
  resolveSmlAttachItems: jest.fn(),
  indexAttachment: jest.fn().mockResolvedValue(undefined),
  deleteAttachment: jest.fn().mockResolvedValue(undefined),
});

/**
 * Builds a security mock whose privilege check returns `authorized` for
 * every requested kibana privilege. The expanded `api:` form returned by
 * `actions.api.get(...)` is what we'd see at runtime — we mirror that here
 * so the assertions below can match on the same value.
 */
const buildSecurity = ({ authorized = true }: { authorized?: boolean } = {}): jest.Mocked<
  Pick<SecurityPluginStart, 'authz'>
> & {
  authz: {
    actions: { api: { get: jest.Mock } };
    checkPrivilegesDynamicallyWithRequest: jest.Mock;
  };
} => {
  const checkPrivileges = jest
    .fn()
    .mockImplementation(async ({ kibana }: { kibana: string[] }) => ({
      hasAllRequested: authorized,
      privileges: {
        kibana: kibana.map((privilege) => ({ privilege, authorized })),
      },
    }));
  return {
    authz: {
      actions: {
        api: {
          get: jest.fn((privilege: string) => `api:${privilege}`),
        },
      },
      checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
    },
  } as any;
};

// Reuse the Zod schema as the source of truth for the test input shape so
// the test fixtures cannot silently drift from the contract.
type StepInput = z.infer<typeof SmlIndexAttachmentInputSchema>;

const buildHandlerContext = (input: StepInput, request = httpServerMock.createKibanaRequest()) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn(),
    getScopedEsClient: jest.fn(),
    renderInputTemplate: jest.fn((value: unknown) => value),
    getFakeRequest: jest.fn().mockReturnValue(request),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'contextEngine.addEntry',
});

// Minimal `spaces` mock — only `spacesService.getSpaceId` is consumed. The
// `Pick` makes the partial-mock intent explicit so we don't cast to `any`.
type MockedSpaces = Pick<SpacesPluginStart, 'spacesService'>;

/**
 * Builds a step definition with the "everything is allowed" defaults most
 * tests want (no spaces service, authorized security check, feature flag
 * on) — override just the piece under test.
 */
const buildDefinition = (
  overrides: Partial<Parameters<typeof createContextEngineAddEntryStepDefinition>[0]> = {}
) =>
  createContextEngineAddEntryStepDefinition({
    getStartContract: () => buildStartContract(),
    getSpaces: () => undefined,
    getSecurity: () => buildSecurity() as unknown as SecurityPluginStart,
    isFeatureEnabled: async () => true,
    ...overrides,
  });

describe('createContextEngineAddEntryStepDefinition', () => {
  it('exposes the expected step type id, schemas, and tech-preview stability', () => {
    const definition = buildDefinition();
    expect(definition.id).toBe('contextEngine.addEntry');
    expect(definition.stability).toBe('tech_preview');
    expect(definition.inputSchema).toBeDefined();
    expect(definition.outputSchema).toBeDefined();
    expect(typeof definition.handler).toBe('function');
  });

  it('forwards caller-supplied chunks as content-mode write for upsert', async () => {
    const startContract = buildStartContract();
    const spaces: MockedSpaces = {
      spacesService: { getSpaceId: jest.fn().mockReturnValue('test-space') } as any,
    };
    const definition = buildDefinition({
      getStartContract: () => startContract,
      getSpaces: () => spaces as SpacesPluginStart,
    });

    const request = httpServerMock.createKibanaRequest();
    const context = buildHandlerContext(
      {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [
          {
            type: 'custom',
            title: 'My title',
            content: 'My content',
            description: 'desc',
          },
        ],
      },
      request
    );

    const result = await definition.handler(context as any);

    expect(startContract.indexAttachment).toHaveBeenCalledWith({
      request,
      originId: 'doc-42',
      attachmentType: 'custom',
      // 'upsert' is translated to 'create' on the start contract — see
      // handler comment for why.
      action: 'create',
      // Workflow writes always go through content-mode → manual chunks.
      // No `permissions` key here because this input didn't supply one —
      // see the dedicated 'forwards a caller-supplied permissions object'
      // and 'omits permissions ... when not supplied' tests below for that
      // behavior.
      content: [
        {
          type: 'custom',
          title: 'My title',
          content: 'My content',
          description: 'desc',
        },
      ],
    });
    expect(result).toEqual({
      output: {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'upsert',
        spaceId: 'test-space',
        requestedChunkCount: 1,
        acknowledged: true,
      },
    });
  });

  it('strips optional chunk fields when not provided', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    await definition.handler(context as any);
    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect((callArgs as any).content).toEqual([
      {
        type: 'custom',
        title: 't',
        content: 'c',
      },
    ]);
    expect(Object.keys((callArgs as any).content[0])).toEqual(['type', 'title', 'content']);
  });

  it('preserves optional chunk fields when provided (no permissions field — derived by indexer)', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [
        {
          type: 'custom',
          title: 't',
          content: 'c',
          description: 'd',
          user_id: 'u',
          references: ['r1'],
        },
      ],
    });

    await definition.handler(context as any);
    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect((callArgs as any).content[0]).toEqual({
      type: 'custom',
      title: 't',
      content: 'c',
      description: 'd',
      user_id: 'u',
      references: [{ uri: 'r1' }],
    });
    // The chunk forwarded to the start contract never carries `permissions`.
    // The indexer stamps them from `SmlTypeDefinition.getPermissions`, so
    // the workflow step cannot spoof them either via the input schema or
    // via the forwarded chunk.
    expect((callArgs as any).content[0]).not.toHaveProperty('permissions');
  });

  it('forwards a caller-supplied permissions object to indexAttachment for upsert', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'corpus_entry',
      action: 'upsert',
      chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
      permissions: {
        elasticsearch: { indices: [{ name: 'my-index' }] },
        kibana: { privileges: [] },
      },
    });

    await definition.handler(context as any);

    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect((callArgs as any).permissions).toEqual({
      elasticsearch: { indices: [{ name: 'my-index' }] },
      kibana: { privileges: [] },
    });
  });

  it('omits permissions from the indexAttachment call when the workflow author does not supply it', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'corpus_entry',
      action: 'upsert',
      chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
    });

    await definition.handler(context as any);

    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect(callArgs as any).not.toHaveProperty('permissions');
  });

  it('surfaces SmlPermissionsConflictError from the start contract as a step error result', async () => {
    const startContract = buildStartContract();
    startContract.indexAttachment.mockRejectedValue(
      new Error(
        "attachmentType 'lens' derives permissions via getPermissions() and does not accept a caller-supplied 'permissions' value for origin 'doc-1'."
      )
    );
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'lens',
      action: 'upsert',
      chunks: [{ type: 'lens', title: 't', content: 'c' }],
      permissions: {
        elasticsearch: { indices: [{ name: 'spoofed' }] },
      },
    });

    const result = await definition.handler(context as any);

    expect(result.output).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('derives permissions via getPermissions()');
  });

  it('handles delete by calling deleteAttachment with ingestionMethod="all" and reports requestedChunkCount = 0', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'delete',
    });

    const result = await definition.handler(context as any);

    expect(startContract.deleteAttachment).toHaveBeenCalledWith({
      request: expect.anything(),
      originId: 'doc-1',
      attachmentType: 'custom',
      // Workflow steps "own" the origin they wrote → wipe everything.
      // 'all' tells the AGL indexer to skip the ingestion_method filter
      // and remove every chunk for the origin (manual + crawled).
      ingestionMethod: 'all',
    });
    // Delete uses the dedicated `deleteAttachment` method on the contract,
    // not `indexAttachment` — keeps "delete with custom scope" out of the
    // index-mutation API surface.
    expect(startContract.indexAttachment).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: expect.objectContaining({
        action: 'delete',
        spaceId: 'default',
        requestedChunkCount: 0,
        acknowledged: true,
      }),
    });
  });

  it('allows delete to proceed when the attachment type is not registered', async () => {
    const startContract = buildStartContract();
    startContract.getTypeDefinition.mockReturnValue(undefined);
    const definition = buildDefinition({ getStartContract: () => startContract });

    // Cleanup must remain functional after the plugin that registered the
    // type is disabled — otherwise stale chunks become unreachable from
    // the workflow surface.
    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'unregistered-but-was-written-before',
      action: 'delete',
    });

    const result = await definition.handler(context as any);

    expect(startContract.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentType: 'unregistered-but-was-written-before',
        ingestionMethod: 'all',
      })
    );
    // The type-definition lookup must NOT be consulted for delete.
    expect(startContract.getTypeDefinition).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.output?.action).toBe('delete');
  });

  it('upserts under an unregistered attachment type by handing the call to the indexer', async () => {
    // Content-mode writes accept any `attachmentType` — the indexer
    // stamps empty permissions and emits a once-per-process warn when
    // the type isn't registered. The workflow step's job is to forward
    // the call, not to pre-validate the type, so the only assertion
    // here is that the call reaches `indexAttachment` with the
    // unregistered identifier intact and a success result is returned.
    const startContract = buildStartContract();
    startContract.indexAttachment.mockResolvedValueOnce(undefined);
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'my_notes',
      action: 'upsert',
      chunks: [{ type: 'my_notes', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);

    expect(startContract.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        originId: 'doc-1',
        attachmentType: 'my_notes',
        action: 'create',
      })
    );
    // Registration handling lives in the indexer — the step never calls getTypeDefinition.
    expect(startContract.getTypeDefinition).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.output?.action).toBe('upsert');
  });

  it('returns an error result and logs when indexAttachment throws', async () => {
    const startContract = buildStartContract();
    startContract.indexAttachment.mockRejectedValueOnce(new Error('ES write failed'));
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.output).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('ES write failed');
    expect(context.logger.error).toHaveBeenCalledWith(
      'contextEngine.addEntry workflow step failed',
      expect.any(Error)
    );
  });

  it('returns an error when the start contract is not yet available', async () => {
    const definition = buildDefinition({
      getStartContract: () => {
        throw new Error('start contract not ready');
      },
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('start contract not ready');
  });

  it('falls back to "default" space when spaces service is unavailable', async () => {
    const startContract = buildStartContract();
    const definition = buildDefinition({ getStartContract: () => startContract });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.output?.spaceId).toBe('default');
  });

  describe('agentContextLayer:write privilege check', () => {
    it('checks the privilege against the workflow fake request and dispatches the write when authorized', async () => {
      const startContract = buildStartContract();
      const security = buildSecurity({ authorized: true });
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => security as unknown as SecurityPluginStart,
      });

      const request = httpServerMock.createKibanaRequest();
      const context = buildHandlerContext(
        {
          originId: 'doc-1',
          attachmentType: 'custom',
          action: 'upsert',
          chunks: [{ type: 'custom', title: 't', content: 'c' }],
        },
        request
      );

      const result = await definition.handler(context as any);

      expect(security.authz.actions.api.get).toHaveBeenCalledWith(
        apiPrivileges.writeAgentContextLayer
      );
      expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
      const checkPrivileges =
        security.authz.checkPrivilegesDynamicallyWithRequest.mock.results[0].value;
      // The security mock expands the api action via `actions.api.get`,
      // so we expect the wrapped `api:` form here — same as what runtime
      // `checkPrivilegesDynamicallyWithRequest` would receive.
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${apiPrivileges.writeAgentContextLayer}`],
      });
      expect(result.error).toBeUndefined();
      expect(startContract.indexAttachment).toHaveBeenCalledTimes(1);
    });

    it('rejects upsert with an error and never calls indexAttachment when the caller lacks the privilege', async () => {
      const startContract = buildStartContract();
      const security = buildSecurity({ authorized: false });
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => security as unknown as SecurityPluginStart,
      });

      const context = buildHandlerContext({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [{ type: 'custom', title: 't', content: 'c' }],
      });

      const result = await definition.handler(context as any);

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(apiPrivileges.writeAgentContextLayer);
      expect((result.error as Error).message).toContain('upsert');
      expect(startContract.indexAttachment).not.toHaveBeenCalled();
      // The type-definition lookup happens after the privilege gate, so it
      // must not be consulted when the caller is unauthorized.
      expect(startContract.getTypeDefinition).not.toHaveBeenCalled();
    });

    it('rejects delete with an error and never calls deleteAttachment when the caller lacks the privilege', async () => {
      const startContract = buildStartContract();
      const security = buildSecurity({ authorized: false });
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => security as unknown as SecurityPluginStart,
      });

      const context = buildHandlerContext({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'delete',
      });

      const result = await definition.handler(context as any);

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(apiPrivileges.writeAgentContextLayer);
      expect((result.error as Error).message).toContain('delete');
      expect(startContract.deleteAttachment).not.toHaveBeenCalled();
    });

    it('skips the privilege check and proceeds when the security plugin is absent', async () => {
      const startContract = buildStartContract();
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => undefined,
      });

      const context = buildHandlerContext({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [{ type: 'custom', title: 't', content: 'c' }],
      });

      const result = await definition.handler(context as any);

      expect(result.error).toBeUndefined();
      expect(startContract.indexAttachment).toHaveBeenCalledTimes(1);
      expect(context.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('security plugin is not available')
      );
    });
  });

  describe('Context Engine feature-flag check', () => {
    it('calls isFeatureEnabled with the workflow fake request and proceeds when enabled', async () => {
      const startContract = buildStartContract();
      const isFeatureEnabled = jest.fn().mockResolvedValue(true);
      const definition = buildDefinition({
        getStartContract: () => startContract,
        isFeatureEnabled,
      });

      const request = httpServerMock.createKibanaRequest();
      const context = buildHandlerContext(
        {
          originId: 'doc-1',
          attachmentType: 'custom',
          action: 'upsert',
          chunks: [{ type: 'custom', title: 't', content: 'c' }],
        },
        request
      );

      const result = await definition.handler(context as any);

      expect(isFeatureEnabled).toHaveBeenCalledWith(request);
      expect(result.error).toBeUndefined();
      expect(startContract.indexAttachment).toHaveBeenCalledTimes(1);
    });

    it('rejects upsert with an error and never calls indexAttachment when the feature flag is disabled', async () => {
      const startContract = buildStartContract();
      const security = buildSecurity({ authorized: true });
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => security as unknown as SecurityPluginStart,
        isFeatureEnabled: async () => false,
      });

      const context = buildHandlerContext({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [{ type: 'custom', title: 't', content: 'c' }],
      });

      const result = await definition.handler(context as any);

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      // Surfaces the experimental nature, since this error reaches workflow
      // authors/operators.
      expect((result.error as Error).message).toContain(
        'Context Engine (experimental feature) is disabled'
      );
      expect((result.error as Error).message).toContain('upsert');
      expect(startContract.indexAttachment).not.toHaveBeenCalled();
      // Privilege check must be skipped — the feature-flag gate is an
      // earlier short-circuit and should prevent any work, including a
      // network round-trip to the security plugin.
      expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
    });

    it('rejects delete with an error and never calls deleteAttachment when the feature flag is disabled', async () => {
      const startContract = buildStartContract();
      const security = buildSecurity({ authorized: true });
      const definition = buildDefinition({
        getStartContract: () => startContract,
        getSecurity: () => security as unknown as SecurityPluginStart,
        isFeatureEnabled: async () => false,
      });

      const context = buildHandlerContext({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'delete',
      });

      const result = await definition.handler(context as any);

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain(
        'Context Engine (experimental feature) is disabled'
      );
      expect((result.error as Error).message).toContain('delete');
      expect(startContract.deleteAttachment).not.toHaveBeenCalled();
      expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
    });
  });

  describe('end-to-end: real indexer derives permissions from getPermissions', () => {
    // Wires a real `SmlIndexer` (with a registry holding the given type)
    // behind the workflow step's start contract, so these tests exercise
    // the actual permission-resolution logic rather than a mocked stand-in.
    const buildEndToEndHarness = (registeredType: SmlTypeDefinition) => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      jest
        .spyOn(smlStorage, 'createSmlStorage')
        .mockReturnValue({ getClient: getClientMock } as any);

      const registry = createSmlTypeRegistry();
      registry.register(registeredType);

      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        get: jest.fn().mockReturnThis(),
        isLevelEnabled: jest.fn().mockReturnValue(true),
      };

      const esClient = {
        deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
        count: jest.fn().mockResolvedValue({ count: 0 }),
      };

      const realIndexer = createSmlIndexer({ registry, logger });

      // Fake start contract that delegates content-mode writes to the real
      // indexer instead of using the default mocks.
      const startContract = buildStartContract();
      startContract.indexAttachment.mockImplementation(async (params: any) => {
        await realIndexer.indexAttachment({
          ...params,
          spaces: ['default'],
          esClient,
          savedObjectsClient: {},
          logger,
        });
      });
      // The handler still checks the registry to reject unknown types;
      // since we registered the type on the real registry, mirror that on
      // the start-contract mock so the guard passes.
      startContract.getTypeDefinition.mockImplementation((id: string) => registry.get(id));

      const definition = buildDefinition({ getStartContract: () => startContract });

      return { definition, bulkMock, esClient };
    };

    const noopAsyncIterable = () => (async function* () {})();

    it('stamps `saved_object:lens/get` on content-mode chunks for a visualization-like type', async () => {
      const { definition, bulkMock } = buildEndToEndHarness({
        id: 'lens',
        list: noopAsyncIterable,
        getSmlData: jest.fn(),
        toAttachment: jest.fn(),
        getPermissions: () => kibanaSavedObjectPermissions({ savedObjectType: 'lens' }),
      });

      const context = buildHandlerContext({
        originId: 'viz-1',
        attachmentType: 'lens',
        action: 'upsert',
        chunks: [{ type: 'lens', title: 'My Viz', content: 'content' }],
      });

      const result = await definition.handler(context as any);

      expect(result.error).toBeUndefined();
      expect(bulkMock).toHaveBeenCalledTimes(1);
      const ops = bulkMock.mock.calls[0][0].operations;
      expect(ops).toHaveLength(1);
      // The workflow author supplied no permissions (the schema does not
      // accept any); the indexer stamps the visualization type's
      // `getPermissions` output verbatim.
      expect(ops[0].index.document.permissions).toEqual({
        kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
        elasticsearch: { indices: [] },
      });
      // The stamped doc carries `ingestion_method: 'manual'` because this
      // came through content mode, but the permissions match what the
      // crawler (origin mode) would have written — single source of truth.
      expect(ops[0].index.document.ingestion_method).toBe('manual');
    });

    it('end-to-end: no-hook type + workflow-supplied permissions are stamped on the indexed document', async () => {
      const { definition, bulkMock } = buildEndToEndHarness({
        id: 'corpus_entry',
        list: noopAsyncIterable,
        getSmlData: jest.fn(),
        toAttachment: jest.fn(),
        // No getPermissions hook, matching the real corpus_entry type.
      });

      const context = buildHandlerContext({
        originId: 'ki-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 'My KI', content: 'content' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }, { name: 'my-data-stream' }] },
        },
      });

      const result = await definition.handler(context as any);

      expect(result.error).toBeUndefined();
      const ops = bulkMock.mock.calls[0][0].operations;
      expect(ops[0].index.document.permissions).toEqual({
        kibana: { privileges: [] },
        elasticsearch: { indices: [{ name: 'my-index' }, { name: 'my-data-stream' }] },
      });
    });

    it('end-to-end: hook-backed type + workflow-supplied permissions fails the step without writing to ES', async () => {
      const { definition, bulkMock, esClient } = buildEndToEndHarness({
        id: 'lens',
        list: noopAsyncIterable,
        getSmlData: jest.fn(),
        toAttachment: jest.fn(),
        getPermissions: () => kibanaSavedObjectPermissions({ savedObjectType: 'lens' }),
      });

      const context = buildHandlerContext({
        originId: 'viz-conflict',
        attachmentType: 'lens',
        action: 'upsert',
        chunks: [{ type: 'lens', title: 'My Viz', content: 'content' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'spoofed-index' }] },
        },
      });

      const result = await definition.handler(context as any);

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain('getPermissions()');
      expect(bulkMock).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  describe('input-schema permission spoofing guard', () => {
    // The chunk schema is `strict()` so an unknown `permissions` field is
    // rejected at parse time rather than being silently dropped. The handler
    // would also strip it, but rejecting up-front makes the misuse loud —
    // a workflow author trying to "set permissions for this chunk" gets a
    // schema error instead of believing it worked.
    it('rejects a chunk that carries a permissions field (schema is strict)', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [
          {
            type: 'custom',
            title: 't',
            content: 'c',
            permissions: ['saved_object:lens/get'],
          },
        ],
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.success ? [] : parsed.error.issues;
      // Zod v4 emits `unrecognized_keys` for `.strict()` violations; the
      // exact message wording is checked rather than the code so we
      // don't tightly couple to internals that have moved between versions.
      expect(JSON.stringify(issues)).toContain('permissions');
    });

    it('accepts a chunk that omits the permissions field', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'custom',
        action: 'upsert',
        chunks: [{ type: 'custom', title: 't', content: 'c' }],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('input-schema permissions field', () => {
    it('accepts a valid permissions object with elasticsearch.indices and kibana.privileges', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }, { name: 'my-data-stream' }] },
          kibana: { privileges: [{ name: 'saved_object:dashboard/get' }] },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts a permissions object with only elasticsearch.indices', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }] },
        },
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts an empty permissions object', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {},
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts omitting permissions entirely (backward compatible)', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
      });

      expect(parsed.success).toBe(true);
    });

    it('rejects elasticsearch.indices entries that are bare strings instead of {name} objects', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {
          elasticsearch: { indices: ['my-index'] },
        },
      });

      expect(parsed.success).toBe(false);
    });

    it('rejects unknown keys under permissions (schema is strict)', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }] },
          documents: ['doc-1'],
        },
      });

      expect(parsed.success).toBe(false);
      const issues = parsed.success ? [] : parsed.error.issues;
      expect(JSON.stringify(issues)).toContain('documents');
    });

    it('rejects unknown keys under permissions.elasticsearch (schema is strict)', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'upsert',
        chunks: [{ type: 'corpus_entry', title: 't', content: 'c' }],
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }], documents: ['doc-1'] },
        },
      });

      expect(parsed.success).toBe(false);
    });

    it('ignores permissions on the delete action (delete branch has no permissions field)', () => {
      const parsed = SmlIndexAttachmentInputSchema.safeParse({
        originId: 'doc-1',
        attachmentType: 'corpus_entry',
        action: 'delete',
        permissions: {
          elasticsearch: { indices: [{ name: 'my-index' }] },
        },
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).not.toHaveProperty('permissions');
      }
    });
  });
});
