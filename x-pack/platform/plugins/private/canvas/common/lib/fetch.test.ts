/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch, arrayBufferFetch } from './fetch';

describe('fetch', () => {
  it('test fetch headers', () => {
    expect(fetch.defaults.headers.Accept).toBe('application/json');
    expect(fetch.defaults.headers['Content-Type']).toBe('application/json');
    expect(fetch.defaults.headers['kbn-xsrf']).toBe('professionally-crafted-string-of-text');
  });

  it('test arrayBufferFetch headers', () => {
    expect(arrayBufferFetch.defaults.headers.Accept).toBe('application/json');
    expect(arrayBufferFetch.defaults.headers['Content-Type']).toBe('application/json');
    expect(arrayBufferFetch.defaults.headers['kbn-xsrf']).toBe(
      'professionally-crafted-string-of-text'
    );
    expect(arrayBufferFetch.defaults.responseType).toBe('arraybuffer');
  });
});
