/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeMkdirsRequest,
  decodeMkdirsResponse,
  decodeReadFilesRequest,
  decodeReadFilesResponse,
  decodeRunCommandRequest,
  decodeRunCommandResponse,
  decodeStatFilesResponse,
  decodeWriteFilesRequest,
  decodeWriteFilesResponse,
  encodeMkdirsRequest,
  encodeMkdirsResponse,
  encodeReadFilesRequest,
  encodeReadFilesResponse,
  encodeRunCommandRequest,
  encodeRunCommandResponse,
  encodeStatFilesResponse,
  encodeWriteFilesRequest,
  encodeWriteFilesResponse,
} from './messages';

describe('sandbox proto messages', () => {
  it('round-trips RunCommand requests', () => {
    const request = {
      command: 'echo "héllo"',
      env: { PATH: '/bin', EMPTY: '' },
      directory: '/workspace/sub',
      timeout_seconds: 12.5,
      task_group_id: 'turn-1',
    };
    expect(decodeRunCommandRequest(encodeRunCommandRequest(request))).toEqual(request);
  });

  it('round-trips RunCommand responses, including negative exit codes', () => {
    const response = { stdout: 'out', stderr: 'err', exit_code: -1, timed_out: true };
    expect(decodeRunCommandResponse(encodeRunCommandResponse(response))).toEqual(response);
  });

  it('matches the canonical protobuf encoding of a RunCommand request', () => {
    // protoc --encode=sandbox.RunCommandRequest <<< 'command: "ls" timeout_seconds: 1'
    const expected = Buffer.from('0a026c7321000000000000f03f', 'hex');
    expect(
      encodeRunCommandRequest({
        command: 'ls',
        env: {},
        directory: '',
        timeout_seconds: 1,
        task_group_id: '',
      })
    ).toEqual(expected);
  });

  it('round-trips StatFiles responses with large int64 values', () => {
    const files = [
      { path: '/a', size: 2 ** 40, is_dir: false, exists: true, modified_time_sec: 4_102_444_800 },
      { path: '/missing', size: 0, is_dir: false, exists: false, modified_time_sec: 0 },
    ];
    expect(decodeStatFilesResponse(encodeStatFilesResponse(files))).toEqual(files);
  });

  it('round-trips ReadFiles requests and responses', () => {
    const requests = [{ path: '/a', maxReadBytes: 100 }, { path: 'b' }];
    expect(decodeReadFilesRequest(encodeReadFilesRequest(requests))).toEqual(requests);

    const results = [
      { path: '/a', content: Buffer.from([0, 1, 2, 255]), success: true },
      { path: 'b', content: Buffer.alloc(0), success: false },
    ];
    expect(decodeReadFilesResponse(encodeReadFilesResponse(results))).toEqual(results);
  });

  it('round-trips WriteFiles requests and responses, including empty files', () => {
    const requests = [
      { path: '/a', content: Buffer.from('x') },
      { path: '/empty', content: Buffer.alloc(0) },
    ];
    expect(decodeWriteFilesRequest(encodeWriteFilesRequest(requests))).toEqual(requests);

    const results = [
      { bytes_written: 1, success: true },
      { bytes_written: 0, success: false },
    ];
    expect(decodeWriteFilesResponse(encodeWriteFilesResponse(results))).toEqual(results);
  });

  it('round-trips Mkdirs as packed booleans', () => {
    expect(decodeMkdirsRequest(encodeMkdirsRequest(['/a', 'b']))).toEqual(['/a', 'b']);
    const success = [true, false, true];
    expect(decodeMkdirsResponse(encodeMkdirsResponse(success))).toEqual(success);
  });

  it('decodes unpacked repeated booleans', () => {
    // field 1, wire type 0, value 1; then value 0
    expect(decodeMkdirsResponse(Buffer.from([0x08, 0x01, 0x08, 0x00]))).toEqual([true, false]);
  });
});
