/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-bitwise */
// Protobuf encoding/decoding uses intentional bitwise operations throughout.

import * as grpc from '@grpc/grpc-js';
import type { Logger } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Protobuf encode/decode for SandboxService RPCs
// (no eval, no code generation — plain Buffer manipulation)
// ---------------------------------------------------------------------------

function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return Buffer.from(bytes);
}

function decodeVarint(buf: Buffer, offset: number): { value: number; bytesRead: number } {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (true) {
    const byte = buf[offset + bytesRead];
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
    if (shift >= 35) throw new Error('varint too large');
  }
  return { value: result, bytesRead };
}

function encodeTag(field: number, wireType: number): Buffer {
  return encodeVarint((field << 3) | wireType);
}

function encodeStringField(field: number, value: string): Buffer {
  if (!value) return Buffer.alloc(0);
  const payload = Buffer.from(value, 'utf8');
  return Buffer.concat([encodeTag(field, 2), encodeVarint(payload.length), payload]);
}

function encodeBytesField(field: number, value: Buffer): Buffer {
  return Buffer.concat([encodeTag(field, 2), encodeVarint(value.length), value]);
}

function encodeDoubleField(field: number, value: number): Buffer {
  if (value === 0) return Buffer.alloc(0);
  const tag = encodeTag(field, 1);
  const payload = Buffer.allocUnsafe(8);
  payload.writeDoubleLE(value, 0);
  return Buffer.concat([tag, payload]);
}

function encodeMapField(field: number, map: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  for (const [k, v] of Object.entries(map)) {
    const entry = Buffer.concat([encodeStringField(1, k), encodeStringField(2, v)]);
    parts.push(Buffer.concat([encodeTag(field, 2), encodeVarint(entry.length), entry]));
  }
  return Buffer.concat(parts);
}

function encodeVarintField(field: number, value: number): Buffer {
  if (value === 0) return Buffer.alloc(0);
  return Buffer.concat([encodeTag(field, 0), encodeVarint(value)]);
}

function encodeNestedMessage(field: number, msg: Buffer): Buffer {
  return Buffer.concat([encodeTag(field, 2), encodeVarint(msg.length), msg]);
}

/** Walk a protobuf buffer and collect all sub-buffers for a given field (wire type 2). */
function collectNestedBuffers(buf: Buffer, fieldNumber: number): Buffer[] {
  const results: Buffer[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      const payload = buf.slice(offset, offset + len);
      offset += len;
      if (field === fieldNumber) results.push(payload);
    } else if (wireType === 0) {
      const { bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return results;
}

export interface RunCommandParams {
  command: string;
  directory?: string;
  env?: Record<string, string>;
  timeout_seconds?: number;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

interface RunCommandRequestProto {
  command: string;
  env: Record<string, string>;
  directory: string;
  timeout_seconds: number;
  task_group_id: string;
}

function serializeRunCommandRequest(req: RunCommandRequestProto): Buffer {
  return Buffer.concat([
    encodeStringField(1, req.command),
    encodeMapField(2, req.env),
    encodeStringField(3, req.directory),
    encodeDoubleField(4, req.timeout_seconds),
    encodeStringField(5, req.task_group_id),
  ]);
}

function deserializeRunCommandResponse(buf: Buffer): RunCommandResult {
  const result: RunCommandResult = { stdout: '', stderr: '', exit_code: 0, timed_out: false };
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (wireType === 0) {
      const { value, bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
      if (field === 3) result.exit_code = value;
      else if (field === 4) result.timed_out = value !== 0;
    } else if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      const payload = buf.slice(offset, offset + len);
      offset += len;
      if (field === 1) result.stdout = payload.toString('utf8');
      else if (field === 2) result.stderr = payload.toString('utf8');
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// StatFiles
// ---------------------------------------------------------------------------

export interface FileMetadata {
  path: string;
  size: number;
  is_dir: boolean;
  exists: boolean;
  modified_time_sec: number;
}

function serializeStatFilesRequest(paths: string[]): Buffer {
  return Buffer.concat(paths.map((p) => encodeStringField(1, p)));
}

function decodeFileMetadata(buf: Buffer): FileMetadata {
  const r: FileMetadata = { path: '', size: 0, is_dir: false, exists: false, modified_time_sec: 0 };
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (wireType === 0) {
      const { value, bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
      if (field === 2) r.size = value;
      else if (field === 3) r.is_dir = value !== 0;
      else if (field === 4) r.exists = value !== 0;
      else if (field === 5) r.modified_time_sec = value;
    } else if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      const payload = buf.slice(offset, offset + len);
      offset += len;
      if (field === 1) r.path = payload.toString('utf8');
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return r;
}

function deserializeStatFilesResponse(buf: Buffer): FileMetadata[] {
  return collectNestedBuffers(buf, 1).map(decodeFileMetadata);
}

// ---------------------------------------------------------------------------
// ReadFiles
// ---------------------------------------------------------------------------

export interface ReadFileResult {
  path: string;
  content: Buffer;
  success: boolean;
}

function serializeReadFilesRequest(
  requests: Array<{ path: string; maxReadBytes?: number }>
): Buffer {
  return Buffer.concat(
    requests.map((req) => {
      const entry = Buffer.concat([
        encodeStringField(1, req.path),
        req.maxReadBytes ? encodeVarintField(2, req.maxReadBytes) : Buffer.alloc(0),
      ]);
      return encodeNestedMessage(1, entry);
    })
  );
}

function decodeReadFileResponse(buf: Buffer): ReadFileResult {
  const r: ReadFileResult = { path: '', content: Buffer.alloc(0), success: false };
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (wireType === 0) {
      const { value, bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
      if (field === 3) r.success = value !== 0;
    } else if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      const payload = buf.slice(offset, offset + len);
      offset += len;
      if (field === 1) r.path = payload.toString('utf8');
      else if (field === 2) r.content = Buffer.from(payload);
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return r;
}

function deserializeReadFilesResponse(buf: Buffer): ReadFileResult[] {
  return collectNestedBuffers(buf, 1).map(decodeReadFileResponse);
}

// ---------------------------------------------------------------------------
// WriteFiles
// ---------------------------------------------------------------------------

export interface WriteFileResult {
  bytes_written: number;
  success: boolean;
}

function serializeWriteFilesRequest(requests: Array<{ path: string; content: Buffer }>): Buffer {
  return Buffer.concat(
    requests.map((req) => {
      const entry = Buffer.concat([
        encodeStringField(1, req.path),
        encodeBytesField(2, req.content),
      ]);
      return encodeNestedMessage(1, entry);
    })
  );
}

function decodeWriteFileResponse(buf: Buffer): WriteFileResult {
  const r: WriteFileResult = { bytes_written: 0, success: false };
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (wireType === 0) {
      const { value, bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
      if (field === 1) r.bytes_written = value;
      else if (field === 2) r.success = value !== 0;
    } else if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      offset += len;
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return r;
}

function deserializeWriteFilesResponse(buf: Buffer): WriteFileResult[] {
  return collectNestedBuffers(buf, 1).map(decodeWriteFileResponse);
}

// ---------------------------------------------------------------------------
// Mkdirs
// ---------------------------------------------------------------------------

function serializeMkdirsRequest(paths: string[]): Buffer {
  return Buffer.concat(paths.map((p) => encodeStringField(1, p)));
}

function deserializeMkdirsResponse(buf: Buffer): boolean[] {
  const results: boolean[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tb } = decodeVarint(buf, offset);
    offset += tb;
    const field = tag >>> 3;
    const wireType = tag & 0x7;
    if (field === 1) {
      if (wireType === 0) {
        const { value, bytesRead: vb } = decodeVarint(buf, offset);
        offset += vb;
        results.push(value !== 0);
      } else if (wireType === 2) {
        // packed booleans
        const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
        offset += lb;
        const end = offset + len;
        while (offset < end) {
          const { value, bytesRead: vb } = decodeVarint(buf, offset);
          offset += vb;
          results.push(value !== 0);
        }
      }
    } else if (wireType === 2) {
      const { value: len, bytesRead: lb } = decodeVarint(buf, offset);
      offset += lb;
      offset += len;
    } else if (wireType === 0) {
      const { bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// SandboxApiClient — one shared gRPC connection to sandbox-api.
// Each method takes a conversationId injected as x-conversation-id metadata.
// ---------------------------------------------------------------------------

const sandboxServiceDef: grpc.ServiceDefinition<any> = {
  runCommand: {
    path: '/sandbox.SandboxService/RunCommand',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: RunCommandRequestProto) => serializeRunCommandRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeRunCommandResponse(buf),
  },
  statFiles: {
    path: '/sandbox.SandboxService/StatFiles',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: string[]) => serializeStatFilesRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeStatFilesResponse(buf),
  },
  readFiles: {
    path: '/sandbox.SandboxService/ReadFiles',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: Array<{ path: string; maxReadBytes?: number }>) =>
      serializeReadFilesRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeReadFilesResponse(buf),
  },
  writeFiles: {
    path: '/sandbox.SandboxService/WriteFiles',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: Array<{ path: string; content: Buffer }>) =>
      serializeWriteFilesRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeWriteFilesResponse(buf),
  },
  mkdirs: {
    path: '/sandbox.SandboxService/Mkdirs',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: string[]) => serializeMkdirsRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeMkdirsResponse(buf),
  },
};

const SandboxServiceConstructor = grpc.makeClientConstructor(sandboxServiceDef, 'SandboxService');

// Deadlines cap every RPC. Without one, an RPC sent on a connection the load
// balancer already dropped hangs forever: the transport keeps retransmitting
// and nothing on either end fails the call.
const FILE_RPC_DEADLINE_MS = 30_000;
// The sandbox server caps a command at its timeout_seconds (600s when unset);
// mirror that plus a margin so a legitimate long command is not cut short.
const DEFAULT_COMMAND_TIMEOUT_SECONDS = 600;
const COMMAND_DEADLINE_MARGIN_MS = 10_000;

// The Elastic Cloud proxy in front of sandbox-api assigns a unique id to every request, forwards it
// to sandbox-api as this header and echoes it back in the response. The proxy logs it as
// `request_id`.
const REQUEST_ID_HEADER = 'x-cloud-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const RPC_SYSTEM = 'grpc';

type SandboxRpcMethod = 'runCommand' | 'statFiles' | 'readFiles' | 'writeFiles' | 'mkdirs';

type UnaryRpc<TRequest, TResponse> = (
  request: TRequest,
  metadata: grpc.Metadata,
  options: grpc.CallOptions,
  callback: (err: grpc.ServiceError | null, response: TResponse) => void
) => grpc.ClientUnaryCall;

/**
 * Reads the request id the proxy echoes back. The proxy appends its own value to one a client
 * supplied, so when several are present the last one wins.
 */
const getRequestId = (metadata?: grpc.Metadata): string | undefined => {
  const lastValue = metadata?.get(REQUEST_ID_HEADER).map(String).pop()?.split(',').pop()?.trim();
  return lastValue ? lastValue.slice(0, MAX_REQUEST_ID_LENGTH) : undefined;
};

/**
 * Client for the sandbox-api gRPC service, over one shared connection.
 *
 * Every RPC writes one debug log line, so that Kibana's logs can be joined per call with the
 * proxy's and sandbox-api's. sandbox-api is expected to log the same fields, with the same values,
 * for the same call. The `rpc.*` fields follow the OpenTelemetry semantic conventions as of
 * `@opentelemetry/semantic-conventions` 1.43.0 (the version Kibana pins); `http.request.id` and
 * `event.duration` are ECS fields.
 *
 * | Field                      | Value                                               | sandbox-api source                   |
 * | -------------------------- | --------------------------------------------------- | ------------------------------------ |
 * | `http.request.id`          | proxy request id from the response (omitted if none) | `x-cloud-request-id` request header |
 * | `sandbox.conversation_id`  | `<space>__<conversation>`                           | `x-conversation-id` request header   |
 * | `rpc.system.name`          | `grpc`                                              | `grpc`                               |
 * | `rpc.method`               | `sandbox.SandboxService/RunCommand`, ...            | fully-qualified gRPC method          |
 * | `rpc.response.status_code` | gRPC status name, for example `OK`, `UNAVAILABLE`   | gRPC status name                     |
 * | `event.duration`           | nanoseconds, measured client-side                   | nanoseconds, server-side             |
 *
 * `http.request.id` is missing when no response arrives, for example on connection errors and
 * deadline timeouts.
 */
export class SandboxApiClient {
  private readonly client: grpc.Client;
  private readonly apiKey: string;
  private readonly logger: Logger;

  constructor({
    host,
    port,
    apiKey,
    logger,
    rootCertPem,
    clientCertPem,
    clientKeyPem,
  }: {
    host: string;
    port: number;
    apiKey: string;
    logger: Logger;
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
    this.logger = logger;
  }

  private metadata(conversationId: string): grpc.Metadata {
    const md = new grpc.Metadata();
    md.set('authorization', `ApiKey ${this.apiKey}`);
    md.set('x-conversation-id', conversationId);
    return md;
  }

  private callOptions(deadlineMs: number): grpc.CallOptions {
    return { deadline: Date.now() + deadlineMs };
  }

  /**
   * Runs one unary RPC and writes its debug log line when the call completes. The log line is
   * written from the `status` event, which fires for both success and failure, because the request
   * id arrives in the response metadata and the promise settles before the status is known.
   */
  private invoke<TRequest, TResponse>(
    method: SandboxRpcMethod,
    request: TRequest,
    conversationId: string,
    deadlineMs: number
  ): Promise<TResponse> {
    const rpcMethod = sandboxServiceDef[method].path.slice(1);
    const rpc = (this.client as unknown as Record<SandboxRpcMethod, UnaryRpc<TRequest, TResponse>>)[
      method
    ];

    return new Promise<TResponse>((resolve, reject) => {
      const startedAt = process.hrtime.bigint();
      let requestId: string | undefined;

      const call = rpc.call(
        this.client,
        request,
        this.metadata(conversationId),
        this.callOptions(deadlineMs),
        (err, response) => (err ? reject(err) : resolve(response))
      );
      call.on('metadata', (metadata) => {
        requestId = getRequestId(metadata);
      });
      call.on('status', (status) => {
        // A response without initial metadata, such as a trailers-only error, carries the id in the
        // trailers.
        requestId = requestId ?? getRequestId(status.metadata);
        const statusName = grpc.status[status.code] ?? String(status.code);
        this.logger.debug(`Sandbox RPC ${rpcMethod} finished with gRPC status ${statusName}`, {
          ...(requestId ? { http: { request: { id: requestId } } } : {}),
          sandbox: { conversation_id: conversationId },
          rpc: {
            system: { name: RPC_SYSTEM },
            method: rpcMethod,
            response: { status_code: statusName },
          },
          event: { duration: Number(process.hrtime.bigint() - startedAt) },
        });
      });
    });
  }

  async runCommand(conversationId: string, params: RunCommandParams): Promise<RunCommandResult> {
    const timeoutSeconds =
      params.timeout_seconds && params.timeout_seconds > 0
        ? params.timeout_seconds
        : DEFAULT_COMMAND_TIMEOUT_SECONDS;
    return this.invoke(
      'runCommand',
      {
        command: params.command,
        directory: params.directory ?? '',
        env: params.env ?? {},
        timeout_seconds: params.timeout_seconds ?? 0,
        task_group_id: '',
      },
      conversationId,
      timeoutSeconds * 1_000 + COMMAND_DEADLINE_MARGIN_MS
    );
  }

  async statFiles(conversationId: string, paths: string[]): Promise<FileMetadata[]> {
    return this.invoke('statFiles', paths, conversationId, FILE_RPC_DEADLINE_MS);
  }

  async readFiles(
    conversationId: string,
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    return this.invoke('readFiles', requests, conversationId, FILE_RPC_DEADLINE_MS);
  }

  async writeFiles(
    conversationId: string,
    requests: Array<{ path: string; content: Buffer }>
  ): Promise<WriteFileResult[]> {
    return this.invoke('writeFiles', requests, conversationId, FILE_RPC_DEADLINE_MS);
  }

  async mkdirs(conversationId: string, paths: string[]): Promise<boolean[]> {
    return this.invoke('mkdirs', paths, conversationId, FILE_RPC_DEADLINE_MS);
  }

  close(): void {
    this.client.close();
  }
}
