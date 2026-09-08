/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import type { Metadata } from '@grpc/grpc-js';
import type {
  ConnectorCallbackRequest,
  ConnectorCallbackResult,
  RunCommandParams,
  RunCommandResult,
} from './grpc_client';
// `jest.mock` below is hoisted above this import, so the mocked
// `makeClientConstructor` is in place before grpc_client.ts is evaluated.
import { SandboxApiClient } from './grpc_client';

const mockRunCommandBidi = jest.fn();
const mockClose = jest.fn();

interface MockServiceClient {
  close: () => void;
  runCommandBidi: (metadata: Metadata) => unknown;
}

jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual<typeof import('@grpc/grpc-js')>('@grpc/grpc-js');

  // A `function` (rather than a `class`) so the file stays within max-classes-per-file
  // while remaining newable, which is what `makeClientConstructor` must return.
  function MockSandboxServiceClient(this: MockServiceClient): void {
    this.close = mockClose;
    this.runCommandBidi = mockRunCommandBidi;
  }

  return {
    ...actual,
    makeClientConstructor: () => MockSandboxServiceClient,
  };
});

// ---------------------------------------------------------------------------
// Independent (test-local) protobuf reference implementation.
//
// grpc_client.ts hand-rolls its wire format and does not export its codec
// helpers, so the encode/decode below intentionally duplicates the wire spec
// rather than reusing the implementation under test: an independent codec is
// what makes the round-trip assertions meaningful. All arithmetic avoids
// bitwise operators so the test needs no lint suppressions.
// ---------------------------------------------------------------------------

const VARINT_BASE = 128;

const encodeVarint = (value: number): Buffer => {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining > 0x7f) {
    bytes.push((remaining % VARINT_BASE) + VARINT_BASE);
    remaining = Math.floor(remaining / VARINT_BASE);
  }
  bytes.push(remaining);
  return Buffer.from(bytes);
};

const decodeVarint = (buf: Buffer, offset: number): { value: number; bytesRead: number } => {
  let value = 0;
  let multiplier = 1;
  let bytesRead = 0;
  for (;;) {
    const byte = buf[offset + bytesRead];
    bytesRead += 1;
    value += (byte % VARINT_BASE) * multiplier;
    if (byte < VARINT_BASE) break;
    multiplier *= VARINT_BASE;
  }
  return { value, bytesRead };
};

const encodeTag = (field: number, wireType: number): Buffer => encodeVarint(field * 8 + wireType);

const encodeStringField = (field: number, value: string): Buffer => {
  const payload = Buffer.from(value, 'utf8');
  return Buffer.concat([encodeTag(field, 2), encodeVarint(payload.length), payload]);
};

const encodeBytesField = (field: number, value: Buffer): Buffer =>
  Buffer.concat([encodeTag(field, 2), encodeVarint(value.length), value]);

const encodeVarintField = (field: number, value: number): Buffer =>
  Buffer.concat([encodeTag(field, 0), encodeVarint(value)]);

const encodeNestedField = (field: number, msg: Buffer): Buffer =>
  Buffer.concat([encodeTag(field, 2), encodeVarint(msg.length), msg]);

interface DecodedField {
  field: number;
  wireType: number;
  bytes?: Buffer;
  varint?: number;
  double?: number;
}

const decodeMessage = (buf: Buffer): DecodedField[] => {
  const fields: DecodedField[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead: tagBytes } = decodeVarint(buf, offset);
    offset += tagBytes;
    const field = Math.floor(tag / 8);
    const wireType = tag % 8;
    if (wireType === 2) {
      const { value: len, bytesRead: lenBytes } = decodeVarint(buf, offset);
      offset += lenBytes;
      fields.push({ field, wireType, bytes: buf.subarray(offset, offset + len) });
      offset += len;
    } else if (wireType === 0) {
      const { value, bytesRead } = decodeVarint(buf, offset);
      offset += bytesRead;
      fields.push({ field, wireType, varint: value });
    } else if (wireType === 1) {
      fields.push({ field, wireType, double: buf.readDoubleLE(offset) });
      offset += 8;
    } else if (wireType === 5) {
      offset += 4;
    } else {
      throw new Error(`Unsupported wire type ${wireType}`);
    }
  }
  return fields;
};

const findField = (fields: readonly DecodedField[], field: number): DecodedField | undefined =>
  fields.find((candidate) => candidate.field === field);

const readString = (fields: readonly DecodedField[], field: number): string =>
  findField(fields, field)?.bytes?.toString('utf8') ?? '';

const readBytes = (fields: readonly DecodedField[], field: number): Buffer =>
  findField(fields, field)?.bytes ?? Buffer.alloc(0);

const readDouble = (fields: readonly DecodedField[], field: number): number =>
  findField(fields, field)?.double ?? 0;

// --- Message-level reference codecs -----------------------------------------

interface RunCommandRequestWire {
  command: string;
  env: Record<string, string>;
  directory: string;
  timeout_seconds: number;
  task_group_id: string;
}

const decodeRunCommandRequest = (payload: Buffer): RunCommandRequestWire => {
  const fields = decodeMessage(payload);
  const env: Record<string, string> = {};
  for (const entry of fields) {
    if (entry.field === 2 && entry.bytes) {
      const kv = decodeMessage(entry.bytes);
      env[readString(kv, 1)] = readString(kv, 2);
    }
  }
  return {
    command: readString(fields, 1),
    env,
    directory: readString(fields, 3),
    timeout_seconds: readDouble(fields, 4),
    task_group_id: readString(fields, 5),
  };
};

interface ConnectorCallbackResponseWire {
  request_id: string;
  status: string;
  data: Buffer;
  error_message: string;
}

const decodeConnectorCallbackResponse = (payload: Buffer): ConnectorCallbackResponseWire => {
  const fields = decodeMessage(payload);
  return {
    request_id: readString(fields, 1),
    status: readString(fields, 2),
    data: readBytes(fields, 3),
    error_message: readString(fields, 4),
  };
};

type DecodedClientMessage =
  | { arm: 'command'; value: RunCommandRequestWire }
  | { arm: 'callback_response'; value: ConnectorCallbackResponseWire };

/** Decodes a RunCommandClientMessage as the sandbox service would. */
const decodeClientMessage = (buf: Buffer): DecodedClientMessage => {
  const fields = decodeMessage(buf);
  if (fields.length !== 1) {
    throw new Error(`Expected exactly one oneof arm, got ${fields.length}`);
  }
  const [arm] = fields;
  if (arm.wireType !== 2 || !arm.bytes) {
    throw new Error(`Expected a length-delimited oneof arm, got wire type ${arm.wireType}`);
  }
  if (arm.field === 1) return { arm: 'command', value: decodeRunCommandRequest(arm.bytes) };
  if (arm.field === 2) {
    return { arm: 'callback_response', value: decodeConnectorCallbackResponse(arm.bytes) };
  }
  throw new Error(`Unexpected RunCommandClientMessage field ${arm.field}`);
};

const encodeConnectorCallbackRequest = (req: ConnectorCallbackRequest): Buffer =>
  Buffer.concat([
    encodeStringField(1, req.request_id),
    encodeStringField(2, req.connector_id),
    encodeStringField(3, req.sub_action),
    encodeBytesField(4, req.sub_action_params),
  ]);

const encodeRunCommandResponse = (result: RunCommandResult): Buffer =>
  Buffer.concat([
    encodeStringField(1, result.stdout),
    encodeStringField(2, result.stderr),
    encodeVarintField(3, result.exit_code),
    encodeVarintField(4, result.timed_out ? 1 : 0),
  ]);

/** RunCommandServerMessage with the `callback_request` (field 1) arm set. */
const serverCallbackRequest = (req: ConnectorCallbackRequest): Buffer =>
  encodeNestedField(1, encodeConnectorCallbackRequest(req));

/** RunCommandServerMessage with the `result` (field 2) arm set. */
const serverResult = (result: RunCommandResult): Buffer =>
  encodeNestedField(2, encodeRunCommandResponse(result));

// ---------------------------------------------------------------------------
// Fake ClientDuplexStream
// ---------------------------------------------------------------------------

class FakeDuplexStream extends EventEmitter {
  public destroyed = false;
  public readonly writes: Buffer[] = [];

  public readonly write = jest.fn((chunk: Buffer): boolean => {
    this.writes.push(chunk);
    return true;
  });

  public readonly end = jest.fn();

  public readonly destroy = jest.fn(() => {
    this.destroyed = true;
  });
}

/** Lets pending microtasks (the async connector-callback handler) run to completion. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const CONVERSATION_ID = 'conversation-1';

type ConnectorCallbackHandler = (req: ConnectorCallbackRequest) => Promise<ConnectorCallbackResult>;

/** Keeps `mock.calls` strongly typed as `[ConnectorCallbackRequest]` even for zero-arg impls. */
const createCallbackHandlerMock = (
  implementation: ConnectorCallbackHandler
): jest.Mock<Promise<ConnectorCallbackResult>, [ConnectorCallbackRequest]> =>
  jest.fn(implementation);

describe('grpc_client', () => {
  let stream: FakeDuplexStream;
  let client: SandboxApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    stream = new FakeDuplexStream();
    mockRunCommandBidi.mockImplementation(() => stream);
    client = new SandboxApiClient({ host: 'sandbox-api', port: 50051, apiKey: 'secret-key' });
  });

  /**
   * Drives runCommandBidi and returns the pending promise plus a settlement tracker,
   * so tests can assert the outer promise stays pending while callbacks are in flight.
   */
  const startBidi = (
    params: RunCommandParams,
    onConnectorCallback: (req: ConnectorCallbackRequest) => Promise<ConnectorCallbackResult>
  ) => {
    const promise = client.runCommandBidi(CONVERSATION_ID, params, onConnectorCallback);
    let state: 'pending' | 'resolved' | 'rejected' = 'pending';
    promise.then(
      () => {
        state = 'resolved';
      },
      () => {
        state = 'rejected';
      }
    );
    return { promise, getState: () => state };
  };

  describe('wire format round-trip', () => {
    it('round-trips the RunCommandClientMessage `command` arm with all fields populated', async () => {
      const params: RunCommandParams = {
        command: 'echo "héllo 🌙" && exit 0',
        directory: '/work/investigation',
        env: { GREETING: 'gruß dich', EMPTY_VALUE: '', PATH: '/usr/bin:/bin' },
        timeout_seconds: 42.5,
      };
      const { promise } = startBidi(params, jest.fn());

      const decoded = decodeClientMessage(stream.writes[0]);
      expect(decoded.arm).toBe('command');
      expect(decoded.value).toEqual({
        command: params.command,
        directory: params.directory,
        env: params.env,
        timeout_seconds: 42.5,
        task_group_id: '',
      });

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('omits proto3 defaults on the `command` arm and round-trips them back to defaults', async () => {
      const { promise } = startBidi({ command: 'ls' }, jest.fn());

      // Only field 1 (command) should be on the wire: empty directory / env and a
      // zero timeout are proto3 defaults and must not be encoded.
      const commandPayload = decodeMessage(stream.writes[0])[0].bytes as Buffer;
      expect(decodeMessage(commandPayload).map(({ field }) => field)).toEqual([1]);

      const decoded = decodeClientMessage(stream.writes[0]);
      expect(decoded.value).toEqual({
        command: 'ls',
        directory: '',
        env: {},
        timeout_seconds: 0,
        task_group_id: '',
      });

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('round-trips the RunCommandClientMessage `callback_response` arm with binary data', async () => {
      const data = Buffer.from([0x00, 0xff, 0x7f, 0x80, 0x0a, 0xc3, 0x28, 0xf0, 0x9f, 0x8c, 0x99]);
      const { promise } = startBidi({ command: 'sandbox-cb' }, async () => ({
        status: 'ok',
        data,
      }));

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'req-1',
          connector_id: 'connector-1',
          sub_action: 'run',
          sub_action_params: Buffer.from('{}'),
        })
      );
      await flush();

      const decoded = decodeClientMessage(stream.writes[1]);
      if (decoded.arm !== 'callback_response') {
        throw new Error(`Expected a callback_response arm, got ${decoded.arm}`);
      }
      expect(decoded.value).toEqual({
        request_id: 'req-1',
        status: 'ok',
        data,
        error_message: '',
      });
      expect(decoded.value.data.equals(data)).toBe(true);

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('round-trips an empty data Buffer on the `callback_response` arm', async () => {
      const { promise } = startBidi({ command: 'sandbox-cb' }, async () => ({
        status: 'ok',
        data: Buffer.alloc(0),
      }));

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'req-empty',
          connector_id: 'c',
          sub_action: 's',
          sub_action_params: Buffer.alloc(0),
        })
      );
      await flush();

      const callbackPayload = decodeMessage(stream.writes[1])[0].bytes as Buffer;
      // request_id + status + explicit zero-length data; error_message is a default.
      expect(decodeMessage(callbackPayload).map(({ field }) => field)).toEqual([1, 2, 3]);
      expect(decodeConnectorCallbackResponse(callbackPayload)).toEqual({
        request_id: 'req-empty',
        status: 'ok',
        data: Buffer.alloc(0),
        error_message: '',
      });

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('round-trips a ConnectorCallbackRequest with non-ASCII strings and binary params', async () => {
      const request: ConnectorCallbackRequest = {
        request_id: 'req-ünïcode-🌙',
        connector_id: 'connector-ä-1',
        sub_action: 'pushToService',
        // Deliberately not valid UTF-8, to prove bytes survive untouched.
        sub_action_params: Buffer.from([0x00, 0x01, 0xc3, 0x28, 0xff, 0x80, 0x7f, 0x0a]),
      };
      const onConnectorCallback = createCallbackHandlerMock(async () => ({ status: 'ok' }));
      const { promise } = startBidi({ command: 'sandbox-cb' }, onConnectorCallback);

      stream.emit('data', serverCallbackRequest(request));
      await flush();

      expect(onConnectorCallback).toHaveBeenCalledTimes(1);
      const [received] = onConnectorCallback.mock.calls[0];
      expect(received).toEqual(request);
      expect(received.sub_action_params.equals(request.sub_action_params)).toBe(true);

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('round-trips an all-empty ConnectorCallbackRequest', async () => {
      const request: ConnectorCallbackRequest = {
        request_id: '',
        connector_id: '',
        sub_action: '',
        sub_action_params: Buffer.alloc(0),
      };
      const onConnectorCallback = createCallbackHandlerMock(async () => ({ status: 'ok' }));
      const { promise } = startBidi({ command: 'sandbox-cb' }, onConnectorCallback);

      // Explicitly encoded zero-length fields.
      stream.emit('data', serverCallbackRequest(request));
      await flush();
      expect(onConnectorCallback.mock.calls[0][0]).toEqual(request);

      // Fields omitted entirely (proto3 defaults) must decode to the same values.
      stream.emit('data', encodeNestedField(1, Buffer.alloc(0)));
      await flush();
      expect(onConnectorCallback.mock.calls[1][0]).toEqual(request);

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('round-trips a RunCommandResponse, including defaults', async () => {
      const result: RunCommandResult = {
        stdout: 'line one\nzeile zwei ä\n🌙\n',
        stderr: 'warning: schäl',
        exit_code: 137,
        timed_out: true,
      };
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      stream.emit('data', serverResult(result));
      await expect(promise).resolves.toEqual(result);

      const defaults: RunCommandResult = {
        stdout: '',
        stderr: '',
        exit_code: 0,
        timed_out: false,
      };
      const second = new FakeDuplexStream();
      mockRunCommandBidi.mockImplementation(() => second);
      const secondPromise = client.runCommandBidi(CONVERSATION_ID, { command: 'x' }, jest.fn());
      second.emit('data', encodeNestedField(2, Buffer.alloc(0)));
      await expect(secondPromise).resolves.toEqual(defaults);
    });
  });

  describe('deserializeRunCommandServerMessage discrimination', () => {
    it('treats field 1 as a callback_request and field 2 as a result', async () => {
      const onConnectorCallback = createCallbackHandlerMock(async () => ({ status: 'ok' }));
      const { promise, getState } = startBidi({ command: 'x' }, onConnectorCallback);

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'r',
          connector_id: 'c',
          sub_action: 's',
          sub_action_params: Buffer.alloc(0),
        })
      );
      await flush();
      expect(onConnectorCallback).toHaveBeenCalledTimes(1);
      expect(getState()).toBe('pending');

      stream.emit(
        'data',
        serverResult({ stdout: 'ok', stderr: '', exit_code: 0, timed_out: false })
      );
      await expect(promise).resolves.toEqual({
        stdout: 'ok',
        stderr: '',
        exit_code: 0,
        timed_out: false,
      });
      expect(onConnectorCallback).toHaveBeenCalledTimes(1);
    });

    it('skips unknown leading fields before the recognized oneof arm', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      const message = Buffer.concat([
        encodeVarintField(7, 300),
        encodeStringField(8, 'ignored'),
        serverResult({ stdout: 'done', stderr: '', exit_code: 3, timed_out: false }),
      ]);
      stream.emit('data', message);
      await expect(promise).resolves.toEqual({
        stdout: 'done',
        stderr: '',
        exit_code: 3,
        timed_out: false,
      });
    });

    it('rejects and destroys the stream when no recognized field is present', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      stream.emit('data', encodeVarintField(7, 5));
      await expect(promise).rejects.toThrow('RunCommandServerMessage: no recognized field found');
      expect(stream.destroy).toHaveBeenCalled();
    });
  });

  describe('runCommandBidi', () => {
    it('writes the command first, then answers a callback, then resolves on the result', async () => {
      const onConnectorCallback = jest.fn(async () => ({
        status: 'ok' as const,
        data: Buffer.from('{"ok":true}'),
      }));
      const { promise, getState } = startBidi(
        { command: 'sandbox-cb --connector-id c1 --sub-action run', directory: '/work' },
        onConnectorCallback
      );

      // The command must be the very first client message.
      expect(stream.writes).toHaveLength(1);
      expect(decodeClientMessage(stream.writes[0]).arm).toBe('command');

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'req-42',
          connector_id: 'c1',
          sub_action: 'run',
          sub_action_params: Buffer.from('{"a":1}'),
        })
      );
      await flush();

      expect(onConnectorCallback).toHaveBeenCalledWith({
        request_id: 'req-42',
        connector_id: 'c1',
        sub_action: 'run',
        sub_action_params: Buffer.from('{"a":1}'),
      });
      expect(stream.writes).toHaveLength(2);
      expect(decodeClientMessage(stream.writes[1])).toEqual({
        arm: 'callback_response',
        value: {
          request_id: 'req-42',
          status: 'ok',
          data: Buffer.from('{"ok":true}'),
          error_message: '',
        },
      });
      expect(getState()).toBe('pending');
      expect(stream.end).not.toHaveBeenCalled();

      stream.emit(
        'data',
        serverResult({ stdout: 'hello', stderr: '', exit_code: 0, timed_out: false })
      );
      await expect(promise).resolves.toEqual({
        stdout: 'hello',
        stderr: '',
        exit_code: 0,
        timed_out: false,
      });
      expect(stream.end).toHaveBeenCalledTimes(1);
      expect(stream.writes).toHaveLength(2);
    });

    it('passes authorization and conversation metadata to the RPC', () => {
      startBidi({ command: 'x' }, jest.fn());
      const metadata = mockRunCommandBidi.mock.calls[0][0] as Metadata;
      expect(metadata.get('authorization')).toEqual(['ApiKey secret-key']);
      expect(metadata.get('x-conversation-id')).toEqual([CONVERSATION_ID]);
    });

    it('echoes request_id for each sequential callback', async () => {
      const onConnectorCallback = jest.fn(async (req: ConnectorCallbackRequest) => ({
        status: 'ok' as const,
        data: Buffer.from(req.request_id),
      }));
      const { promise } = startBidi({ command: 'x' }, onConnectorCallback);

      for (const requestId of ['req-a', 'req-b', 'req-c']) {
        stream.emit(
          'data',
          serverCallbackRequest({
            request_id: requestId,
            connector_id: 'c',
            sub_action: 's',
            sub_action_params: Buffer.alloc(0),
          })
        );
        await flush();
      }

      expect(stream.writes.slice(1).map((buf) => decodeClientMessage(buf).value)).toEqual([
        { request_id: 'req-a', status: 'ok', data: Buffer.from('req-a'), error_message: '' },
        { request_id: 'req-b', status: 'ok', data: Buffer.from('req-b'), error_message: '' },
        { request_id: 'req-c', status: 'ok', data: Buffer.from('req-c'), error_message: '' },
      ]);

      stream.emit('data', serverResult({ stdout: '', stderr: '', exit_code: 0, timed_out: false }));
      await promise;
    });

    it('writes an error callback_response when the handler rejects, without settling the call', async () => {
      const onConnectorCallback = jest.fn(async () => {
        throw new Error('connector exploded');
      });
      const { promise, getState } = startBidi({ command: 'x' }, onConnectorCallback);

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'req-boom',
          connector_id: 'c',
          sub_action: 's',
          sub_action_params: Buffer.alloc(0),
        })
      );
      await flush();

      expect(stream.writes).toHaveLength(2);
      const decoded = decodeClientMessage(stream.writes[1]);
      expect(decoded.arm).toBe('callback_response');
      expect(decoded.value).toEqual({
        request_id: 'req-boom',
        status: 'error',
        data: Buffer.alloc(0),
        error_message: 'Error: connector exploded',
      });
      // bash must not hang and the RPC must stay open.
      expect(getState()).toBe('pending');
      expect(stream.destroy).not.toHaveBeenCalled();
      expect(stream.end).not.toHaveBeenCalled();

      stream.emit(
        'data',
        serverResult({ stdout: 'recovered', stderr: '', exit_code: 1, timed_out: false })
      );
      await expect(promise).resolves.toEqual({
        stdout: 'recovered',
        stderr: '',
        exit_code: 1,
        timed_out: false,
      });
    });

    it('does not write a callback_response once the stream is destroyed', async () => {
      let releaseHandler: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        releaseHandler = resolve;
      });
      const onConnectorCallback = jest.fn(async () => {
        await gate;
        return { status: 'ok' as const };
      });
      const { promise } = startBidi({ command: 'x' }, onConnectorCallback);

      stream.emit(
        'data',
        serverCallbackRequest({
          request_id: 'req-late',
          connector_id: 'c',
          sub_action: 's',
          sub_action_params: Buffer.alloc(0),
        })
      );
      await flush();

      const error: Error & { code?: number } = new Error('connection dropped');
      error.code = 14;
      stream.emit('error', error);
      stream.destroy();

      releaseHandler();
      await flush();

      expect(stream.writes).toHaveLength(1);
      await expect(promise).rejects.toThrow('connection dropped');
    });

    it('rejects with the original error and preserves err.code on a stream error', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      const error: Error & { code?: number } = new Error('14 UNAVAILABLE: no connection');
      error.code = 14;
      stream.emit('error', error);

      await expect(promise).rejects.toThrow('14 UNAVAILABLE: no connection');
      await expect(promise).rejects.toMatchObject({ code: 14 });
      await expect(promise).rejects.toBe(error);
    });

    it('ignores a stream error that arrives after the result', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      stream.emit(
        'data',
        serverResult({ stdout: 'a', stderr: '', exit_code: 0, timed_out: false })
      );
      const error: Error & { code?: number } = new Error('late failure');
      error.code = 14;
      stream.emit('error', error);

      await expect(promise).resolves.toEqual({
        stdout: 'a',
        stderr: '',
        exit_code: 0,
        timed_out: false,
      });
    });

    it('rejects when the stream ends without a result', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      stream.emit('end');
      await expect(promise).rejects.toThrow('RunCommandBidi stream ended without a result');
    });

    it('does not reject on `end` once a result has been delivered', async () => {
      const { promise } = startBidi({ command: 'x' }, jest.fn());
      stream.emit(
        'data',
        serverResult({ stdout: 'done', stderr: '', exit_code: 0, timed_out: false })
      );
      stream.emit('end');
      await expect(promise).resolves.toEqual({
        stdout: 'done',
        stderr: '',
        exit_code: 0,
        timed_out: false,
      });
    });
  });

  describe('close', () => {
    it('closes the underlying gRPC client', () => {
      client.close();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
