/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_IMPORT_MAX_PAYLOAD_BYTES,
  getImportPayloadTooLargeMessage,
  getPayloadTooLarge,
  IMPORT_MAX_PAYLOAD_SETTING,
  ImportPayloadTooLargeError,
} from './import_payload_limit';

const createHttpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: { status },
    body: { statusCode: status },
  });

const smallWorkflows = [{ id: 'small', yaml: 'name: small' }];
const largeWorkflows = [{ id: 'large', yaml: 'x'.repeat(DEFAULT_IMPORT_MAX_PAYLOAD_BYTES) }];

describe('getPayloadTooLarge', () => {
  it.each([413, 502])('detects a %s response for a body over the limit', (status) => {
    const result = getPayloadTooLarge(
      createHttpError(status),
      largeWorkflows,
      DEFAULT_IMPORT_MAX_PAYLOAD_BYTES
    );

    expect(result?.limitBytes).toBe(DEFAULT_IMPORT_MAX_PAYLOAD_BYTES);
    expect(result?.requestBytes).toBeGreaterThan(DEFAULT_IMPORT_MAX_PAYLOAD_BYTES);
  });

  it('ignores a 502 for a body within the limit', () => {
    expect(
      getPayloadTooLarge(createHttpError(502), smallWorkflows, DEFAULT_IMPORT_MAX_PAYLOAD_BYTES)
    ).toBeNull();
  });

  it('uses the configured limit rather than the default', () => {
    const configuredLimit = DEFAULT_IMPORT_MAX_PAYLOAD_BYTES * 2;

    expect(getPayloadTooLarge(createHttpError(413), largeWorkflows, configuredLimit)).toBeNull();
  });

  it.each([400, 403, 500])('ignores a %s response', (status) => {
    expect(
      getPayloadTooLarge(createHttpError(status), largeWorkflows, DEFAULT_IMPORT_MAX_PAYLOAD_BYTES)
    ).toBeNull();
  });

  it('ignores errors that are not HTTP errors', () => {
    expect(
      getPayloadTooLarge(new Error('boom'), largeWorkflows, DEFAULT_IMPORT_MAX_PAYLOAD_BYTES)
    ).toBeNull();
    expect(getPayloadTooLarge('boom', largeWorkflows, DEFAULT_IMPORT_MAX_PAYLOAD_BYTES)).toBeNull();
  });
});

describe('getImportPayloadTooLargeMessage', () => {
  it('names both sizes and the setting that raises the limit', () => {
    const message = getImportPayloadTooLargeMessage({
      requestBytes: 3.2 * 1024 * 1024,
      limitBytes: DEFAULT_IMPORT_MAX_PAYLOAD_BYTES,
    });

    expect(message).toContain('3.2 MB');
    expect(message).toContain('1.0 MB');
    expect(message).toContain(IMPORT_MAX_PAYLOAD_SETTING);
  });

  it('is the message of ImportPayloadTooLargeError', () => {
    const details = { requestBytes: 2 * 1024 * 1024, limitBytes: DEFAULT_IMPORT_MAX_PAYLOAD_BYTES };

    expect(new ImportPayloadTooLargeError(details).message).toBe(
      getImportPayloadTooLargeMessage(details)
    );
  });
});
