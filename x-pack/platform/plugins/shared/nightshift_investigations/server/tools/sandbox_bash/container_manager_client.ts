/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';

// ---------------------------------------------------------------------------
// Minimal protobuf encode/decode for ContainerManager RPCs
// (no eval, no code generation — plain Buffer manipulation)
//
// GetContainerRequest  { organization_id=1:string, message_thread_id=2:string, inference_public_cert=3:bytes }
// GetContainerResponse { container_name=1:string, container_ip=2:string, sandbox_public_cert=3:bytes }
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

export interface GetContainerResult {
  container_name: string;
  container_ip: string;
  sandbox_public_cert: Buffer;
  container_port: number;
}

function serializeGetContainerRequest(req: {
  organization_id: string;
  message_thread_id: string;
  inference_public_cert: Buffer;
}): Buffer {
  return Buffer.concat([
    encodeStringField(1, req.organization_id),
    encodeStringField(2, req.message_thread_id),
    encodeBytesField(3, req.inference_public_cert),
  ]);
}

function deserializeGetContainerResponse(buf: Buffer): GetContainerResult {
  const result: GetContainerResult = {
    container_name: '',
    container_ip: '',
    sandbox_public_cert: Buffer.alloc(0),
    container_port: 0,
  };
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
      if (field === 1) result.container_name = payload.toString('utf8');
      else if (field === 2) result.container_ip = payload.toString('utf8');
      else if (field === 3) result.sandbox_public_cert = payload;
    } else if (wireType === 0) {
      const { value, bytesRead: vb } = decodeVarint(buf, offset);
      offset += vb;
      if (field === 4) result.container_port = value;
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// gRPC client (insecure — containermanager is typically an internal service)
// ---------------------------------------------------------------------------

const containerManagerServiceDef: grpc.ServiceDefinition<any> = {
  getContainer: {
    path: '/containermanager.ContainerManager/GetContainer',
    requestStream: false,
    responseStream: false,
    requestSerialize: (req: Parameters<typeof serializeGetContainerRequest>[0]) =>
      serializeGetContainerRequest(req),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (res: Buffer) => res,
    responseDeserialize: (buf: Buffer) => deserializeGetContainerResponse(buf),
  },
};

const ContainerManagerConstructor = grpc.makeClientConstructor(
  containerManagerServiceDef,
  'ContainerManager'
);

export class ContainerManagerClient {
  private readonly client: grpc.Client;

  constructor({
    host,
    port,
    serverCertPem,
  }: {
    host: string;
    port: number;
    serverCertPem?: Buffer;
  }) {
    const credentials = serverCertPem
      ? grpc.credentials.createSsl(serverCertPem, null, null)
      : grpc.credentials.createInsecure();
    this.client = new ContainerManagerConstructor(`${host}:${port}`, credentials);
  }

  async getContainer(opts: {
    organizationId: string;
    messageThreadId: string;
    inferencePublicCert: Buffer;
  }): Promise<GetContainerResult> {
    const call = promisify(
      (this.client as any).getContainer.bind(this.client) as (
        request: {
          organization_id: string;
          message_thread_id: string;
          inference_public_cert: Buffer;
        },
        callback: (err: grpc.ServiceError | null, response: GetContainerResult) => void
      ) => void
    );

    return call({
      organization_id: opts.organizationId,
      message_thread_id: opts.messageThreadId,
      inference_public_cert: opts.inferencePublicCert,
    });
  }

  close(): void {
    this.client.close();
  }
}
