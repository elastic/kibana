/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACHMENT_UPLOAD_CONTENT_VALIDATORS } from './attachment_upload_validation';

describe('attachment upload content validation', () => {
  const { json, ndjson } = DEFAULT_ATTACHMENT_UPLOAD_CONTENT_VALIDATORS;

  it('accepts valid JSON and rejects random content', () => {
    expect(json.validate(Buffer.from('[{"message":"hello"}]'))).toBeUndefined();
    expect(json.validate(Buffer.from('not JSON'))).toMatch(/^File is not valid JSON:/);
  });

  it('accepts one complete JSON value per NDJSON line', () => {
    const content = Buffer.from('{"message":"one"}\n{"message":"two"}\n');

    expect(ndjson.validate(content)).toBeUndefined();
  });

  it('rejects pretty-printed JSON as NDJSON', () => {
    const content = Buffer.from('{\n  "message": "hello"\n}\n');

    expect(ndjson.validate(content)).toMatch(/^NDJSON line 1 is not valid JSON:/);
  });
});
