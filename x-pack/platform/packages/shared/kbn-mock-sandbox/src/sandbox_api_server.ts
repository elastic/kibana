/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as grpc from '@grpc/grpc-js';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  CONVERSATION_ID_METADATA_KEY,
  sandboxServiceDefinition,
  type FileMetadata,
  type ReadFileRequest,
  type ReadFileResult,
  type RunCommandRequest,
  type RunCommandResult,
  type WriteFileRequest,
  type WriteFileResult,
} from '@kbn/sandbox-proto';
import { SandboxUnavailableError } from './errors';

/** Executes sandbox RPCs for a conversation. The Docker implementation is the default. */
export interface SandboxBackend {
  runCommand(
    conversationId: string,
    request: RunCommandRequest,
    signal: AbortSignal
  ): Promise<RunCommandResult>;
  statFiles(conversationId: string, paths: string[]): Promise<FileMetadata[]>;
  readFiles(conversationId: string, requests: ReadFileRequest[]): Promise<ReadFileResult[]>;
  writeFiles(conversationId: string, requests: WriteFileRequest[]): Promise<WriteFileResult[]>;
  mkdirs(conversationId: string, paths: string[]): Promise<boolean[]>;
}

export { SandboxUnavailableError };

type RpcError = Error & { rpcCode: grpc.status };

const rpcError = (code: grpc.status, message: string): RpcError =>
  Object.assign(new Error(message), { rpcCode: code });

const isRpcError = (error: unknown): error is RpcError =>
  error instanceof Error && 'rpcCode' in error;

// The real sandbox uses the conversation id as the container name, so it must stay within
// Docker's name charset.
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9_.-]{1,200}$/;

export interface MockSandboxServerOptions {
  backend: SandboxBackend;
  log: ToolingLog;
  tls: { certificate: Buffer; key: Buffer };
  host?: string;
  port: number;
  /** When set, the `authorization: ApiKey <key>` metadata must match. Any key is accepted otherwise. */
  apiKey?: string;
}

export interface MockSandboxServer {
  readonly port: number;
  close(): Promise<void>;
}

const getConversationId = (metadata: grpc.Metadata): string => {
  const [conversationId] = metadata.get(CONVERSATION_ID_METADATA_KEY);
  if (typeof conversationId !== 'string' || !CONVERSATION_ID_PATTERN.test(conversationId)) {
    throw rpcError(
      grpc.status.INVALID_ARGUMENT,
      `${CONVERSATION_ID_METADATA_KEY} metadata must match ${CONVERSATION_ID_PATTERN}`
    );
  }
  return conversationId;
};

const authenticate = (metadata: grpc.Metadata, apiKey: string | undefined): void => {
  const [authorization] = metadata.get('authorization');
  if (typeof authorization !== 'string' || !authorization.startsWith('ApiKey ')) {
    throw rpcError(grpc.status.UNAUTHENTICATED, 'missing "authorization: ApiKey <key>"');
  }
  if (apiKey !== undefined && authorization !== `ApiKey ${apiKey}`) {
    throw rpcError(grpc.status.UNAUTHENTICATED, 'invalid API key');
  }
};

const toServiceError = (error: unknown): Partial<grpc.ServiceError> => {
  if (isRpcError(error)) {
    return { code: error.rpcCode, details: error.message };
  }
  if (error instanceof SandboxUnavailableError) {
    return { code: grpc.status.UNAVAILABLE, details: error.message };
  }
  return {
    code: grpc.status.INTERNAL,
    details: error instanceof Error ? error.message : String(error),
  };
};

/** Starts a TLS gRPC server that implements the Kibana-facing `sandbox.SandboxService`. */
export const startMockSandboxServer = async ({
  backend,
  log,
  tls,
  host = 'localhost',
  port,
  apiKey,
}: MockSandboxServerOptions): Promise<MockSandboxServer> => {
  const server = new grpc.Server();

  const handle =
    <Request, Response>(
      name: string,
      summarize: (request: Request, response: Response) => string,
      run: (conversationId: string, request: Request, signal: AbortSignal) => Promise<Response>
    ): grpc.handleUnaryCall<Request, Response> =>
    (call, callback) => {
      const startedAt = Date.now();
      const controller = new AbortController();
      call.on('cancelled', () => controller.abort());
      let conversationId = '?';
      Promise.resolve()
        .then(() => {
          authenticate(call.metadata, apiKey);
          conversationId = getConversationId(call.metadata);
          return run(conversationId, call.request, controller.signal);
        })
        .then(
          (response) => {
            log.info(
              `[${conversationId}] ${name} ${summarize(call.request, response)} (${
                Date.now() - startedAt
              }ms)`
            );
            callback(null, response);
          },
          (error: unknown) => {
            const serviceError = toServiceError(error);
            log.warning(
              `[${conversationId}] ${name} failed: ${grpc.status[serviceError.code ?? 0]} ${
                serviceError.details
              }`
            );
            callback(serviceError);
          }
        );
    };

  const countOk = (results: ReadonlyArray<boolean | { success: boolean }>): string => {
    const ok = results.filter((result) => (typeof result === 'boolean' ? result : result.success));
    return `${ok.length}/${results.length} ok`;
  };

  server.addService(sandboxServiceDefinition, {
    runCommand: handle<RunCommandRequest, RunCommandResult>(
      'RunCommand',
      (request, response) =>
        `${JSON.stringify(request.command.slice(0, 80))} -> exit ${response.exit_code}${
          response.timed_out ? ' (timed out)' : ''
        }`,
      (conversationId, request, signal) => backend.runCommand(conversationId, request, signal)
    ),
    statFiles: handle<string[], FileMetadata[]>(
      'StatFiles',
      (paths, files) =>
        `${paths.length} paths, ${files.filter((file) => file.exists).length} exist`,
      (conversationId, paths) => backend.statFiles(conversationId, paths)
    ),
    readFiles: handle<ReadFileRequest[], ReadFileResult[]>(
      'ReadFiles',
      (_requests, results) => countOk(results),
      (conversationId, requests) => backend.readFiles(conversationId, requests)
    ),
    writeFiles: handle<WriteFileRequest[], WriteFileResult[]>(
      'WriteFiles',
      (_requests, results) => countOk(results),
      (conversationId, requests) => backend.writeFiles(conversationId, requests)
    ),
    mkdirs: handle<string[], boolean[]>(
      'Mkdirs',
      (_paths, results) => countOk(results),
      (conversationId, paths) => backend.mkdirs(conversationId, paths)
    ),
  });

  const credentials = grpc.ServerCredentials.createSsl(
    null,
    [{ cert_chain: tls.certificate, private_key: tls.key }],
    false
  );

  const boundPort = await new Promise<number>((resolve, reject) => {
    server.bindAsync(`${host}:${port}`, credentials, (error, actualPort) =>
      error ? reject(error) : resolve(actualPort)
    );
  });

  return {
    port: boundPort,
    close: () =>
      new Promise<void>((resolve) => {
        server.tryShutdown(() => resolve());
        // In-flight commands can run for minutes; don't let them block shutdown.
        setTimeout(() => {
          server.forceShutdown();
          resolve();
        }, 2_000).unref();
      }),
  };
};
