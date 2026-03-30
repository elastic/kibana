/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttributesForMode } from './utils';
import { createUserAttachment } from '../test_utils';

describe('transformAttributesForMode', () => {
  it('maps legacy user comments to unified schema when mode is unified', () => {
    const attrs = createUserAttachment().attributes;
    const out = transformAttributesForMode({ attributes: attrs, mode: 'unified' });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes.type).toBe('comment');
      expect(out.attributes.data?.content).toBe(attrs.comment);
    }
  });

  it('keeps legacy shape when mode is legacy', () => {
    const attrs = createUserAttachment().attributes;
    const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
    expect(out.isUnified).toBe(false);
    if (!out.isUnified) {
      expect(out.attributes.type).toBe('user');
      expect(out.attributes.comment).toBe(attrs.comment);
    }
  });
});
