/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import type { Logger } from '@kbn/core/server';
import type { NightshiftInvestigationsConfig } from '../../config';
import { ContainerManagerClient } from './container_manager_client';

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
// StatFilesRequest  { paths=1:repeated string }
// StatFilesResponse { files=1:repeated FileMetadata }
// FileMetadata      { path=1:string, size=2:int64, is_dir=3:bool, exists=4:bool, modified_time_sec=5:int64 }
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
// ReadFilesRequest   { requests=1:repeated ReadFileRequest }
// ReadFileRequest    { path=1:string, max_read_bytes=2:int64 optional }
// ReadFilesResponse  { responses=1:repeated ReadFileResponse }
// ReadFileResponse   { path=1:string, content=2:bytes, success=3:bool }
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
// WriteFilesRequest  { requests=1:repeated WriteFileRequest }
// WriteFileRequest   { path=1:string, chunk_data=2:bytes }
// WriteFilesResponse { responses=1:repeated WriteFileResponse }
// WriteFileResponse  { bytes_written=1:int32, success=2:bool }
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
// MkdirsRequest  { paths=1:repeated string }
// MkdirsResponse { success=1:repeated bool (packed) }
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
// Per-sandbox gRPC client (one per conversation)
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

class SandboxGrpcClient {
  private readonly client: grpc.Client;

  constructor({
    ip,
    port,
    clientCertPem,
    clientKeyPem,
    sandboxCertPem,
  }: {
    ip: string;
    port: number;
    clientCertPem: Buffer;
    clientKeyPem: Buffer;
    sandboxCertPem: Buffer;
  }) {
    const credentials = grpc.credentials.createSsl(sandboxCertPem, clientKeyPem, clientCertPem);
    this.client = new SandboxServiceConstructor(`${ip}:${port}`, credentials, {
      'grpc.ssl_target_name_override': 'sandbox.local',
    });
  }

  async runCommand(params: RunCommandParams): Promise<RunCommandResult> {
    const call = promisify(
      (this.client as any).runCommand.bind(this.client) as (
        request: RunCommandRequestProto,
        callback: (err: grpc.ServiceError | null, response: RunCommandResult) => void
      ) => void
    );
    return call({
      command: params.command,
      directory: params.directory ?? '',
      env: params.env ?? {},
      timeout_seconds: params.timeout_seconds ?? 0,
      task_group_id: '',
    });
  }

  async statFiles(paths: string[]): Promise<FileMetadata[]> {
    const call = promisify(
      (this.client as any).statFiles.bind(this.client) as (
        request: string[],
        callback: (err: grpc.ServiceError | null, response: FileMetadata[]) => void
      ) => void
    );
    return call(paths);
  }

  async readFiles(
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    const call = promisify(
      (this.client as any).readFiles.bind(this.client) as (
        request: Array<{ path: string; maxReadBytes?: number }>,
        callback: (err: grpc.ServiceError | null, response: ReadFileResult[]) => void
      ) => void
    );
    return call(requests);
  }

  async writeFiles(requests: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]> {
    const call = promisify(
      (this.client as any).writeFiles.bind(this.client) as (
        request: Array<{ path: string; content: Buffer }>,
        callback: (err: grpc.ServiceError | null, response: WriteFileResult[]) => void
      ) => void
    );
    return call(requests);
  }

  async mkdirs(paths: string[]): Promise<boolean[]> {
    const call = promisify(
      (this.client as any).mkdirs.bind(this.client) as (
        request: string[],
        callback: (err: grpc.ServiceError | null, response: boolean[]) => void
      ) => void
    );
    return call(paths);
  }

  close(): void {
    this.client.close();
  }
}

// ---------------------------------------------------------------------------
// Connection manager — one SandboxGrpcClient per conversation
// ---------------------------------------------------------------------------

type SandboxConfig = NonNullable<NightshiftInvestigationsConfig['sandbox']>;

export class SandboxConnectionManager {
  private readonly config: SandboxConfig;
  private readonly logger: Logger;
  private readonly containerManager: ContainerManagerClient;
  private readonly clientCertPem: Buffer;
  private readonly clientKeyPem: Buffer;
  /** Pending or resolved per-conversation sandbox clients. */
  private readonly pool = new Map<string, Promise<SandboxGrpcClient>>();

  constructor({ config, logger }: { config: SandboxConfig; logger: Logger }) {
    this.config = config;
    this.logger = logger;
    this.clientCertPem = Buffer.from(config.client_cert);
    this.clientKeyPem = Buffer.from(config.client_key);
    this.containerManager = new ContainerManagerClient({
      host: config.containermanager_host,
      port: config.containermanager_port,
      serverCertPem: config.containermanager_server_cert
        ? Buffer.from(config.containermanager_server_cert)
        : undefined,
    });
  }

  async runCommand(conversationId: string, params: RunCommandParams): Promise<RunCommandResult> {
    const client = await this.getOrCreateClient(conversationId);
    return client.runCommand(params);
  }

  async statFiles(conversationId: string, paths: string[]): Promise<FileMetadata[]> {
    const client = await this.getOrCreateClient(conversationId);
    return client.statFiles(paths);
  }

  async readFiles(
    conversationId: string,
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    const client = await this.getOrCreateClient(conversationId);
    return client.readFiles(requests);
  }

  async writeFiles(
    conversationId: string,
    requests: Array<{ path: string; content: Buffer }>
  ): Promise<WriteFileResult[]> {
    const client = await this.getOrCreateClient(conversationId);
    return client.writeFiles(requests);
  }

  async mkdirs(conversationId: string, paths: string[]): Promise<boolean[]> {
    const client = await this.getOrCreateClient(conversationId);
    return client.mkdirs(paths);
  }

  private getOrCreateClient(conversationId: string): Promise<SandboxGrpcClient> {
    const existing = this.pool.get(conversationId);
    if (existing) return existing;

    const promise = this.allocateSandbox(conversationId).catch((err) => {
      // Remove failed promise so the next call retries.
      this.pool.delete(conversationId);
      throw err;
    });

    this.pool.set(conversationId, promise);
    return promise;
  }

  private async allocateSandbox(conversationId: string): Promise<SandboxGrpcClient> {
    this.logger.debug(`Allocating sandbox for conversation ${conversationId}`);

    const response = await this.containerManager.getContainer({
      organizationId: this.config.organization_id,
      messageThreadId: conversationId,
      inferencePublicCert: this.clientCertPem,
    });

    this.logger.debug(
      `Got sandbox ${response.container_name} at ${response.container_ip} for conversation ${conversationId}`
    );

    return new SandboxGrpcClient({
      ip: response.container_ip,
      port: response.container_port || this.config.sandbox_port,
      clientCertPem: this.clientCertPem,
      clientKeyPem: this.clientKeyPem,
      sandboxCertPem: response.sandbox_public_cert,
    });
  }

  close(): void {
    this.containerManager.close();
    for (const promise of this.pool.values()) {
      promise.then((client) => client.close()).catch(() => {});
    }
    this.pool.clear();
  }
}
