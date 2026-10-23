/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MethodDefinition } from '@grpc/grpc-js';
import type {
  FileMetadata,
  ReadFileRequest,
  ReadFileResult,
  RunCommandRequest,
  RunCommandResult,
  WriteFileRequest,
  WriteFileResult,
} from './messages';
import {
  decodeMkdirsRequest,
  decodeMkdirsResponse,
  decodeReadFilesRequest,
  decodeReadFilesResponse,
  decodeRunCommandRequest,
  decodeRunCommandResponse,
  decodeStatFilesRequest,
  decodeStatFilesResponse,
  decodeWriteFilesRequest,
  decodeWriteFilesResponse,
  encodeMkdirsRequest,
  encodeMkdirsResponse,
  encodeReadFilesRequest,
  encodeReadFilesResponse,
  encodeRunCommandRequest,
  encodeRunCommandResponse,
  encodeStatFilesRequest,
  encodeStatFilesResponse,
  encodeWriteFilesRequest,
  encodeWriteFilesResponse,
} from './messages';

const unary = <Request, Response>(
  name: string,
  requestSerialize: (request: Request) => Buffer,
  requestDeserialize: (buf: Buffer) => Request,
  responseSerialize: (response: Response) => Buffer,
  responseDeserialize: (buf: Buffer) => Response
): MethodDefinition<Request, Response> => ({
  path: `/sandbox.SandboxService/${name}`,
  requestStream: false,
  responseStream: false,
  requestSerialize,
  requestDeserialize,
  responseSerialize,
  responseDeserialize,
});

/**
 * The subset of `sandbox.SandboxService` that Kibana uses. Works for both
 * `grpc.makeClientConstructor` (client) and `grpc.Server#addService` (server).
 */
export const sandboxServiceDefinition = {
  runCommand: unary<RunCommandRequest, RunCommandResult>(
    'RunCommand',
    encodeRunCommandRequest,
    decodeRunCommandRequest,
    encodeRunCommandResponse,
    decodeRunCommandResponse
  ),
  statFiles: unary<string[], FileMetadata[]>(
    'StatFiles',
    encodeStatFilesRequest,
    decodeStatFilesRequest,
    encodeStatFilesResponse,
    decodeStatFilesResponse
  ),
  readFiles: unary<ReadFileRequest[], ReadFileResult[]>(
    'ReadFiles',
    encodeReadFilesRequest,
    decodeReadFilesRequest,
    encodeReadFilesResponse,
    decodeReadFilesResponse
  ),
  writeFiles: unary<WriteFileRequest[], WriteFileResult[]>(
    'WriteFiles',
    encodeWriteFilesRequest,
    decodeWriteFilesRequest,
    encodeWriteFilesResponse,
    decodeWriteFilesResponse
  ),
  mkdirs: unary<string[], boolean[]>(
    'Mkdirs',
    encodeMkdirsRequest,
    decodeMkdirsRequest,
    encodeMkdirsResponse,
    decodeMkdirsResponse
  ),
} as const;

export type SandboxServiceDefinition = typeof sandboxServiceDefinition;

/** gRPC metadata key carrying the conversation (session) id on every call. */
export const CONVERSATION_ID_METADATA_KEY = 'x-conversation-id';
