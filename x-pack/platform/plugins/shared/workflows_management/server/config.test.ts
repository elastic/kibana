/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('workflowsManagement config: import.maxPayloadBytes', () => {
  it('is unset by default so the global server.maxPayload applies', () => {
    expect(config.schema.validate({}).import.maxPayloadBytes).toBeUndefined();
  });

  it('accepts a size in bytes', () => {
    const maxPayloadBytes = 5 * 1024 * 1024;

    expect(config.schema.validate({ import: { maxPayloadBytes } }).import.maxPayloadBytes).toBe(
      maxPayloadBytes
    );
  });

  it.each([0, 100 * 1024 * 1024 + 1])('rejects %d', (maxPayloadBytes) => {
    expect(() => config.schema.validate({ import: { maxPayloadBytes } })).toThrow();
  });

  it('is exposed to the browser', () => {
    expect(config.exposeToBrowser).toMatchObject({ import: true });
  });
});
