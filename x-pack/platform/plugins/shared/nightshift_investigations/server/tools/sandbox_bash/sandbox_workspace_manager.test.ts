/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { createSandboxWorkspaceManager } from './sandbox_workspace_manager';

jest.mock('./connector_manifest', () => ({
  writeConnectorManifest: jest.fn().mockResolvedValue(undefined),
}));

import { writeConnectorManifest } from './connector_manifest';

const mockWriteConnectorManifest = writeConnectorManifest as jest.Mock;

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

const createMutableSessionMock = (): { session: SandboxSession; setIsReset: (v: boolean) => void } => {
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
      conversationId: 'space:conv1',
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('writes manifest on first call regardless of isReset', async () => {
    const session = createSessionMock(false);
    await manager.ensureWorkspaceReady({
      session,
      conversationId: 'space:conv-new',
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('skips manifest write when session is not reset and connector set is unchanged', async () => {
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    // First call records the connector set
    await manager.ensureWorkspaceReady({ session, conversationId: 'space:conv2', callContext });
    mockWriteConnectorManifest.mockClear();

    // Second call — same session (not reset), same connectors → skip
    await manager.ensureWorkspaceReady({ session, conversationId: 'space:conv2', callContext });

    expect(mockWriteConnectorManifest).not.toHaveBeenCalled();
  });

  it('rewrites manifest when connector set changes', async () => {
    const session = createSessionMock(false);

    await manager.ensureWorkspaceReady({
      session,
      conversationId: 'space:conv3',
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    await manager.ensureWorkspaceReady({
      session,
      conversationId: 'space:conv3',
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
      conversationId: 'space:conv4',
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    // Pod evicted → isReset flips
    setIsReset(true);
    await manager.ensureWorkspaceReady({
      session,
      conversationId: 'space:conv4',
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
        conversationId: 'space:conv5',
        callContext: createCallContext(['connector-1']),
      })
    ).resolves.toBeUndefined();

    expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
  });
});
