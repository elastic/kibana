/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

const MB = 1024 * 1024;

describe('resource bootstrap config', () => {
  const validate = (value: Record<string, unknown>) => config.schema.validate(value);

  it('is disabled by default and does not prune', () => {
    const validated = validate({});

    expect(validated.enabled).toBe(false);
    expect(validated.prune).toBe(false);
  });

  it('applies the files again at every start by default', () => {
    expect(validate({}).reapplyOnStart).toBe(true);
    expect(validate({ reapplyOnStart: false }).reapplyOnStart).toBe(false);
  });

  it('rejects the removed pruneForce setting', () => {
    expect(() => validate({ prune: true, pruneForce: true })).toThrow(/pruneForce/);
  });

  it('has defaults for the limits on the source', () => {
    const validated = validate({});

    expect(validated.maxFiles).toBe(1000);
    expect(validated.maxFileSize.getValueInBytes()).toBe(10 * MB);
    expect(validated.maxTotalSize.getValueInBytes()).toBe(50 * MB);
  });

  it('attempts a run three times by default', () => {
    expect(validate({}).maxAttempts).toBe(3);
  });

  it.each([0, 101])('rejects %d attempts', (maxAttempts) => {
    expect(() => validate({ maxAttempts })).toThrow();
  });

  it('has a ten minute timeout by default', () => {
    expect(validate({}).timeout.asMinutes()).toBe(10);
  });

  it('accepts a longer timeout for large sets', () => {
    expect(validate({ timeout: '45m' }).timeout.asMinutes()).toBe(45);
  });

  it.each(['5s', '3h'])('rejects a timeout of %s, outside 10 seconds to 2 hours', (timeout) => {
    expect(() => validate({ timeout })).toThrow();
  });

  it('requires a path when enabled', () => {
    expect(() => validate({ enabled: true })).toThrow(/\[path\]: is required/);
    expect(() => validate({ enabled: true, path: '/mnt' })).not.toThrow();
  });

  it('does not let one file be allowed to exceed the total', () => {
    expect(() => validate({ maxFileSize: '60mb', maxTotalSize: '50mb' })).toThrow(
      /\[maxFileSize\]: must not exceed \[maxTotalSize\]/
    );
  });

  it('accepts a file limit equal to the total', () => {
    expect(() => validate({ maxFileSize: '50mb', maxTotalSize: '50mb' })).not.toThrow();
  });

  it.each([0, 10001])('rejects a file count of %d', (maxFiles) => {
    expect(() => validate({ maxFiles })).toThrow();
  });

  it('caps what the limits themselves can be set to', () => {
    expect(() => validate({ maxFileSize: '101mb', maxTotalSize: '500mb' })).toThrow();
    expect(() => validate({ maxTotalSize: '501mb' })).toThrow();
  });
});
