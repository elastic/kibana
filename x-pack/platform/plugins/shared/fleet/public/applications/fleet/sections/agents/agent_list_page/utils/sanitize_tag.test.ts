/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeTag } from './sanitize_tag';

describe('sanitizeTag', () => {
  it('should remove special characters from tag name', () => {
    expect(sanitizeTag('Tag-123: []"\'#$%^&*__')).toEqual('Tag-123 __');
  });

  it('should limit tag to 20 length', () => {
    expect(sanitizeTag('aaaa aaaa aaaa aaaa bbb')).toEqual('aaaa aaaa aaaa aaaa ');
  });

  it('should do nothing for empty tag', () => {
    expect(sanitizeTag('')).toEqual('');
  });
});
