/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import {
  sandboxServiceDefinition,
  CONVERSATION_ID_METADATA_KEY,
  type RunCommandRequest,
  type RunCommandResult,
  type FileMetadata,
  type ReadFileRequest,
  type ReadFileResult,
  type WriteFileRequest,
  type WriteFileResult,
} from '@kbn/sandbox-proto';

export type {
  RunCommandResult,
  FileMetadata,
  ReadFileResult,
  WriteFileResult,
} from '@kbn/sandbox-proto';

export interface RunCommandParams {
  command: string;
  directory?: string;
  env?: Record<string, string>;
  timeout_seconds?: number;
}

// ---------------------------------------------------------------------------
// SandboxApiClient — one shared gRPC connection to sandbox-api.
// Each method takes a conversationId injected as x-conversation-id metadata.
// ---------------------------------------------------------------------------

const SandboxServiceConstructor = grpc.makeClientConstructor(
  sandboxServiceDefinition,
  'SandboxService'
);

// Deadlines cap every RPC. Without one, an RPC sent on a connection the load
// balancer already dropped hangs forever: the transport keeps retransmitting
// and nothing on either end fails the call.
const FILE_RPC_DEADLINE_MS = 30_000;
// The sandbox server caps a command at its timeout_seconds (600s when unset);
// mirror that plus a margin so a legitimate long command is not cut short.
const DEFAULT_COMMAND_TIMEOUT_SECONDS = 600;
const COMMAND_DEADLINE_MARGIN_MS = 10_000;

export class SandboxApiClient {
  private readonly client: grpc.Client;
  private readonly apiKey: string;

  constructor({
    host,
    port,
    apiKey,
    rootCertPem,
    clientCertPem,
    clientKeyPem,
  }: {
    host: string;
    port: number;
    apiKey: string;
    rootCertPem?: Buffer;
    clientCertPem?: Buffer;
    clientKeyPem?: Buffer;
  }) {
    // Without a client certificate this is plain TLS and sandbox-api relies on the API key.
    const credentials = grpc.credentials.createSsl(
      rootCertPem ?? null,
      clientKeyPem ?? null,
      clientCertPem ?? null
    );
    // Keepalive pings keep the load-balanced connection warm (cloud LBs drop
    // idle flows silently) and detect a blackholed connection within
    // keepalive_timeout_ms so the channel reconnects instead of hanging RPCs.
    this.client = new SandboxServiceConstructor(`${host}:${port}`, credentials, {
      'grpc.keepalive_time_ms': 60_000,
      'grpc.keepalive_timeout_ms': 20_000,
      'grpc.keepalive_permit_without_calls': 1,
    });
    this.apiKey = apiKey;
  }

  private metadata(conversationId: string): grpc.Metadata {
    const md = new grpc.Metadata();
    md.set('authorization', `ApiKey ${this.apiKey}`);
    md.set(CONVERSATION_ID_METADATA_KEY, conversationId);
    return md;
  }

  private callOptions(deadlineMs: number): grpc.CallOptions {
    return { deadline: Date.now() + deadlineMs };
  }

  async runCommand(conversationId: string, params: RunCommandParams): Promise<RunCommandResult> {
    const call = promisify(
      (this.client as any).runCommand.bind(this.client) as (
        request: RunCommandRequest,
        metadata: grpc.Metadata,
        options: grpc.CallOptions,
        callback: (err: grpc.ServiceError | null, response: RunCommandResult) => void
      ) => void
    );
    const timeoutSeconds =
      params.timeout_seconds && params.timeout_seconds > 0
        ? params.timeout_seconds
        : DEFAULT_COMMAND_TIMEOUT_SECONDS;
    return call(
      {
        command: params.command,
        directory: params.directory ?? '',
        env: params.env ?? {},
        timeout_seconds: params.timeout_seconds ?? 0,
        task_group_id: '',
      },
      this.metadata(conversationId),
      this.callOptions(timeoutSeconds * 1_000 + COMMAND_DEADLINE_MARGIN_MS)
    );
  }

  async statFiles(conversationId: string, paths: string[]): Promise<FileMetadata[]> {
    const call = promisify(
      (this.client as any).statFiles.bind(this.client) as (
        request: string[],
        metadata: grpc.Metadata,
        options: grpc.CallOptions,
        callback: (err: grpc.ServiceError | null, response: FileMetadata[]) => void
      ) => void
    );
    return call(paths, this.metadata(conversationId), this.callOptions(FILE_RPC_DEADLINE_MS));
  }

  async readFiles(
    conversationId: string,
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    const call = promisify(
      (this.client as any).readFiles.bind(this.client) as (
        request: ReadFileRequest[],
        metadata: grpc.Metadata,
        options: grpc.CallOptions,
        callback: (err: grpc.ServiceError | null, response: ReadFileResult[]) => void
      ) => void
    );
    return call(requests, this.metadata(conversationId), this.callOptions(FILE_RPC_DEADLINE_MS));
  }

  async writeFiles(
    conversationId: string,
    requests: Array<{ path: string; content: Buffer }>
  ): Promise<WriteFileResult[]> {
    const call = promisify(
      (this.client as any).writeFiles.bind(this.client) as (
        request: WriteFileRequest[],
        metadata: grpc.Metadata,
        options: grpc.CallOptions,
        callback: (err: grpc.ServiceError | null, response: WriteFileResult[]) => void
      ) => void
    );
    return call(requests, this.metadata(conversationId), this.callOptions(FILE_RPC_DEADLINE_MS));
  }

  async mkdirs(conversationId: string, paths: string[]): Promise<boolean[]> {
    const call = promisify(
      (this.client as any).mkdirs.bind(this.client) as (
        request: string[],
        metadata: grpc.Metadata,
        options: grpc.CallOptions,
        callback: (err: grpc.ServiceError | null, response: boolean[]) => void
      ) => void
    );
    return call(paths, this.metadata(conversationId), this.callOptions(FILE_RPC_DEADLINE_MS));
  }

  close(): void {
    this.client.close();
  }
}
