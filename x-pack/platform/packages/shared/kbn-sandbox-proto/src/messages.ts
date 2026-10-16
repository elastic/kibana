/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Codecs for the `sandbox.SandboxService` messages Kibana uses. Field numbers mirror
// proto/sandbox/sandbox.proto in elastic/sandbox-service.

import { ProtoWriter, readDouble, readFields, readPackedVarints, toInt32 } from './wire';

export interface RunCommandRequest {
  command: string;
  env: Record<string, string>;
  directory: string;
  timeout_seconds: number;
  task_group_id: string;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  is_dir: boolean;
  exists: boolean;
  modified_time_sec: number;
}

export interface ReadFileRequest {
  path: string;
  maxReadBytes?: number;
}

export interface ReadFileResult {
  path: string;
  content: Buffer;
  success: boolean;
}

export interface WriteFileRequest {
  path: string;
  content: Buffer;
}

export interface WriteFileResult {
  bytes_written: number;
  success: boolean;
}

const utf8 = (value: Buffer): string => value.toString('utf8');

// ---------------------------------------------------------------------------
// RunCommand
// ---------------------------------------------------------------------------

export const encodeRunCommandRequest = (request: RunCommandRequest): Buffer =>
  new ProtoWriter()
    .string(1, request.command)
    .stringMap(2, request.env)
    .string(3, request.directory)
    .double(4, request.timeout_seconds)
    .string(5, request.task_group_id)
    .finish();

const decodeMapEntry = (buf: Buffer): [string, string] => {
  let key = '';
  let value = '';
  for (const field of readFields(buf)) {
    if (field.wireType !== 2) continue;
    if (field.field === 1) key = utf8(field.value);
    else if (field.field === 2) value = utf8(field.value);
  }
  return [key, value];
};

export const decodeRunCommandRequest = (buf: Buffer): RunCommandRequest => {
  const request: RunCommandRequest = {
    command: '',
    env: {},
    directory: '',
    timeout_seconds: 0,
    task_group_id: '',
  };
  for (const field of readFields(buf)) {
    if (field.wireType === 2) {
      if (field.field === 1) request.command = utf8(field.value);
      else if (field.field === 2) {
        const [key, value] = decodeMapEntry(field.value);
        request.env[key] = value;
      } else if (field.field === 3) request.directory = utf8(field.value);
      else if (field.field === 5) request.task_group_id = utf8(field.value);
    } else if (field.wireType === 1 && field.field === 4) {
      request.timeout_seconds = readDouble(field.value);
    }
  }
  return request;
};

export const encodeRunCommandResponse = (result: RunCommandResult): Buffer =>
  new ProtoWriter()
    .string(1, result.stdout)
    .string(2, result.stderr)
    .varint(3, result.exit_code)
    .bool(4, result.timed_out)
    .finish();

export const decodeRunCommandResponse = (buf: Buffer): RunCommandResult => {
  const result: RunCommandResult = { stdout: '', stderr: '', exit_code: 0, timed_out: false };
  for (const field of readFields(buf)) {
    if (field.wireType === 2) {
      if (field.field === 1) result.stdout = utf8(field.value);
      else if (field.field === 2) result.stderr = utf8(field.value);
    } else if (field.wireType === 0) {
      if (field.field === 3) result.exit_code = toInt32(field.value);
      else if (field.field === 4) result.timed_out = field.value !== 0;
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Repeated-string requests: StatFiles, Mkdirs
// ---------------------------------------------------------------------------

const encodePaths = (paths: readonly string[]): Buffer => {
  const writer = new ProtoWriter();
  for (const path of paths) {
    writer.bytes(1, Buffer.from(path, 'utf8'));
  }
  return writer.finish();
};

const decodePaths = (buf: Buffer): string[] => {
  const paths: string[] = [];
  for (const field of readFields(buf)) {
    if (field.field === 1 && field.wireType === 2) paths.push(utf8(field.value));
  }
  return paths;
};

// ---------------------------------------------------------------------------
// StatFiles
// ---------------------------------------------------------------------------

export const encodeStatFilesRequest = encodePaths;
export const decodeStatFilesRequest = decodePaths;

const decodeFileMetadata = (buf: Buffer): FileMetadata => {
  const metadata: FileMetadata = {
    path: '',
    size: 0,
    is_dir: false,
    exists: false,
    modified_time_sec: 0,
  };
  for (const field of readFields(buf)) {
    if (field.wireType === 2 && field.field === 1) metadata.path = utf8(field.value);
    else if (field.wireType === 0) {
      if (field.field === 2) metadata.size = field.value;
      else if (field.field === 3) metadata.is_dir = field.value !== 0;
      else if (field.field === 4) metadata.exists = field.value !== 0;
      else if (field.field === 5) metadata.modified_time_sec = field.value;
    }
  }
  return metadata;
};

export const encodeStatFilesResponse = (files: readonly FileMetadata[]): Buffer => {
  const writer = new ProtoWriter();
  for (const file of files) {
    writer.message(
      1,
      new ProtoWriter()
        .string(1, file.path)
        .varint(2, file.size)
        .bool(3, file.is_dir)
        .bool(4, file.exists)
        .varint(5, file.modified_time_sec)
    );
  }
  return writer.finish();
};

export const decodeStatFilesResponse = (buf: Buffer): FileMetadata[] => {
  const files: FileMetadata[] = [];
  for (const field of readFields(buf)) {
    if (field.field === 1 && field.wireType === 2) files.push(decodeFileMetadata(field.value));
  }
  return files;
};

// ---------------------------------------------------------------------------
// ReadFiles
// ---------------------------------------------------------------------------

export const encodeReadFilesRequest = (requests: readonly ReadFileRequest[]): Buffer => {
  const writer = new ProtoWriter();
  for (const request of requests) {
    writer.message(1, new ProtoWriter().string(1, request.path).varint(2, request.maxReadBytes));
  }
  return writer.finish();
};

export const decodeReadFilesRequest = (buf: Buffer): ReadFileRequest[] => {
  const requests: ReadFileRequest[] = [];
  for (const entry of readFields(buf)) {
    if (entry.field !== 1 || entry.wireType !== 2) continue;
    const request: ReadFileRequest = { path: '' };
    for (const field of readFields(entry.value)) {
      if (field.field === 1 && field.wireType === 2) request.path = utf8(field.value);
      else if (field.field === 2 && field.wireType === 0) request.maxReadBytes = field.value;
    }
    requests.push(request);
  }
  return requests;
};

export const encodeReadFilesResponse = (results: readonly ReadFileResult[]): Buffer => {
  const writer = new ProtoWriter();
  for (const result of results) {
    writer.message(
      1,
      new ProtoWriter()
        .string(1, result.path)
        .optionalBytes(2, result.content)
        .bool(3, result.success)
    );
  }
  return writer.finish();
};

export const decodeReadFilesResponse = (buf: Buffer): ReadFileResult[] => {
  const results: ReadFileResult[] = [];
  for (const entry of readFields(buf)) {
    if (entry.field !== 1 || entry.wireType !== 2) continue;
    const result: ReadFileResult = { path: '', content: Buffer.alloc(0), success: false };
    for (const field of readFields(entry.value)) {
      if (field.wireType === 2) {
        if (field.field === 1) result.path = utf8(field.value);
        else if (field.field === 2) result.content = Buffer.from(field.value);
      } else if (field.wireType === 0 && field.field === 3) {
        result.success = field.value !== 0;
      }
    }
    results.push(result);
  }
  return results;
};

// ---------------------------------------------------------------------------
// WriteFiles
// ---------------------------------------------------------------------------

export const encodeWriteFilesRequest = (requests: readonly WriteFileRequest[]): Buffer => {
  const writer = new ProtoWriter();
  for (const request of requests) {
    // chunk_data is written even when empty so an empty file is still a valid write.
    writer.message(1, new ProtoWriter().string(1, request.path).bytes(2, request.content));
  }
  return writer.finish();
};

export const decodeWriteFilesRequest = (buf: Buffer): WriteFileRequest[] => {
  const requests: WriteFileRequest[] = [];
  for (const entry of readFields(buf)) {
    if (entry.field !== 1 || entry.wireType !== 2) continue;
    const request: WriteFileRequest = { path: '', content: Buffer.alloc(0) };
    for (const field of readFields(entry.value)) {
      if (field.wireType !== 2) continue;
      if (field.field === 1) request.path = utf8(field.value);
      else if (field.field === 2) request.content = Buffer.from(field.value);
    }
    requests.push(request);
  }
  return requests;
};

export const encodeWriteFilesResponse = (results: readonly WriteFileResult[]): Buffer => {
  const writer = new ProtoWriter();
  for (const result of results) {
    writer.message(1, new ProtoWriter().varint(1, result.bytes_written).bool(2, result.success));
  }
  return writer.finish();
};

export const decodeWriteFilesResponse = (buf: Buffer): WriteFileResult[] => {
  const results: WriteFileResult[] = [];
  for (const entry of readFields(buf)) {
    if (entry.field !== 1 || entry.wireType !== 2) continue;
    const result: WriteFileResult = { bytes_written: 0, success: false };
    for (const field of readFields(entry.value)) {
      if (field.wireType !== 0) continue;
      if (field.field === 1) result.bytes_written = toInt32(field.value);
      else if (field.field === 2) result.success = field.value !== 0;
    }
    results.push(result);
  }
  return results;
};

// ---------------------------------------------------------------------------
// Mkdirs
// ---------------------------------------------------------------------------

export const encodeMkdirsRequest = encodePaths;
export const decodeMkdirsRequest = decodePaths;

export const encodeMkdirsResponse = (success: readonly boolean[]): Buffer =>
  new ProtoWriter()
    .packedVarints(
      1,
      success.map((ok) => (ok ? 1 : 0))
    )
    .finish();

export const decodeMkdirsResponse = (buf: Buffer): boolean[] => {
  const success: boolean[] = [];
  for (const field of readFields(buf)) {
    if (field.field === 1) {
      success.push(...readPackedVarints(field).map((value) => value !== 0));
    }
  }
  return success;
};
