/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import type { ResolveConnectorCredentials } from './connector_credentials';
import { createSandboxWorkspaceManager } from './sandbox_workspace_manager';

jest.mock('./connector_manifest', () => ({
  writeConnectorManifest: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./elastic_manifest', () => ({
  writeElasticManifest: jest.fn().mockResolvedValue(undefined),
}));

import { writeConnectorManifest } from './connector_manifest';
import { writeElasticManifest } from './elastic_manifest';

const mockWriteConnectorManifest = writeConnectorManifest as jest.Mock;
const mockWriteElasticManifest = writeElasticManifest as jest.Mock;

const createSessionMock = (isReset: boolean): SandboxSession => {
  const session = {
    get isReset() {
      return isReset;
    },
    runCommand: jest.fn(),
    readFiles: jest.fn(),
    writeFiles: jest.fn().mockResolvedValue([]),
    mkdirs: jest.fn(),
    statFiles: jest.fn(),
  };
  return session as unknown as SandboxSession;
};

const createMutableSessionMock = (): {
  session: SandboxSession;
  setIsReset: (v: boolean) => void;
} => {
  let isReset = false;
  const session = {
    get isReset() {
      return isReset;
    },
    runCommand: jest.fn(),
    readFiles: jest.fn(),
    writeFiles: jest.fn().mockResolvedValue([]),
    mkdirs: jest.fn(),
    statFiles: jest.fn(),
  };
  return {
    session: session as unknown as SandboxSession,
    setIsReset: (v: boolean) => {
      isReset = v;
    },
  };
};

const createCallContext = (allowedConnectorIds: readonly string[]): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
});

describe('createSandboxWorkspaceManager', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let manager: ReturnType<typeof createSandboxWorkspaceManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    manager = createSandboxWorkspaceManager({ getDeps: () => ({}), logger });
  });

  it('writes manifest when session isReset is true', async () => {
    const session = createSessionMock(true);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('writes manifest on first call regardless of isReset', async () => {
    const session = createSessionMock(false);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('skips manifest write when session is not reset and connector set is unchanged', async () => {
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    // First call records the connector set
    await manager.ensureWorkspaceReady({ session, callContext });
    mockWriteConnectorManifest.mockClear();

    // Second call — same session (not reset), same connectors → skip
    await manager.ensureWorkspaceReady({ session, callContext });

    expect(mockWriteConnectorManifest).not.toHaveBeenCalled();
  });

  it('rewrites manifest when connector set changes', async () => {
    const session = createSessionMock(false);

    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1', 'connector-2']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('rewrites manifest after pod eviction (isReset flips to true)', async () => {
    const { session, setIsReset } = createMutableSessionMock();

    // First call — not reset, records connector set
    setIsReset(false);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    // Pod evicted → isReset flips
    setIsReset(true);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('swallows manifest write failures and logs a warning (best-effort)', async () => {
    mockWriteConnectorManifest.mockRejectedValueOnce(new Error('gRPC timeout'));
    const session = createSessionMock(true);

    await expect(
      manager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['connector-1']),
      })
    ).resolves.toBeUndefined();

    expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
  });

  it('retries manifest write on next call when previous write failed', async () => {
    mockWriteConnectorManifest.mockRejectedValueOnce(new Error('transient error'));
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    // First call — write fails, key must NOT be recorded
    await manager.ensureWorkspaceReady({ session, callContext });
    mockWriteConnectorManifest.mockClear();

    // Second call — same connector set, but since first write failed, must retry
    await manager.ensureWorkspaceReady({ session, callContext });
    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  describe('telemetryConnectorId', () => {
    let managerWithTelemetry: ReturnType<typeof createSandboxWorkspaceManager>;

    beforeEach(() => {
      managerWithTelemetry = createSandboxWorkspaceManager({
        getDeps: () => ({}),
        telemetryConnectorId: 'elasticsearch-telemetry',
        logger,
      });
    });

    it('writes elastic manifest alongside connector manifest on reset', async () => {
      const session = createSessionMock(true);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['connector-1']),
      });

      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'elasticsearch-telemetry', session })
      );
    });

    it('does not write elastic manifest when telemetryConnectorId is not set', async () => {
      const session = createSessionMock(true);
      await manager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['connector-1']),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
    });

    it('swallows elastic manifest write failures (best-effort)', async () => {
      mockWriteElasticManifest.mockRejectedValueOnce(new Error('gRPC timeout'));
      const session = createSessionMock(true);

      await expect(
        managerWithTelemetry.ensureWorkspaceReady({
          session,
          callContext: createCallContext(['connector-1']),
        })
      ).resolves.toBeUndefined();

      expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
    });

    describe('manifest auth', () => {
      const writeWithCredentials = async (
        resolveConnectorCredentials: ResolveConnectorCredentials
      ) => {
        const callContext = createCallContext(['elasticsearch-telemetry']);
        await createSandboxWorkspaceManager({
          getDeps: () => ({}),
          telemetryConnectorId: 'elasticsearch-telemetry',
          resolveConnectorCredentials,
          logger,
        }).ensureWorkspaceReady({ session: createSessionMock(true), callContext });
        return callContext;
      };

      it('documents basic auth when the connector resolves a user and password', async () => {
        const resolveConnectorCredentials = jest.fn().mockResolvedValue({
          env: { CONNECTOR_SECRET_USER: 'reader', CONNECTOR_SECRET_PASSWORD: 'changeme' },
          secretValues: ['changeme'],
        });

        const callContext = await writeWithCredentials(resolveConnectorCredentials);

        expect(resolveConnectorCredentials).toHaveBeenCalledWith(
          'elasticsearch-telemetry',
          callContext
        );
        expect(mockWriteElasticManifest).toHaveBeenCalledWith(
          expect.objectContaining({ auth: 'basic' })
        );
        expect(JSON.stringify(mockWriteElasticManifest.mock.calls)).not.toContain('changeme');
      });

      it('documents API-key auth when the connector resolves only a password', async () => {
        await writeWithCredentials(
          jest.fn().mockResolvedValue({
            env: { CONNECTOR_SECRET_PASSWORD: 'encoded-key' },
            secretValues: ['encoded-key'],
          })
        );

        expect(mockWriteElasticManifest).toHaveBeenCalledWith(
          expect.objectContaining({ auth: 'apiKey' })
        );
      });

      it('falls back to API-key auth when the connector cannot be resolved', async () => {
        await writeWithCredentials(
          jest.fn().mockResolvedValue({ errorMessage: 'not assigned to this agent' })
        );

        expect(mockWriteElasticManifest).toHaveBeenCalledWith(
          expect.objectContaining({ auth: 'apiKey' })
        );
      });
    });
  });
});
