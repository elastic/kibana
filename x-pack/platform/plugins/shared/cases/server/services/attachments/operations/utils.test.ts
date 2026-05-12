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

  describe('born-unified types (no V1 form)', () => {
    const commonAttrs = {
      owner: 'securitySolution',
      created_at: '2026-05-07T00:00:00.000Z',
      created_by: { username: 'elastic', email: null, full_name: null, profile_uid: 'pu' },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('returns unified for a dashboard attachment even when mode is legacy', () => {
      const attrs = {
        ...commonAttrs,
        type: 'dashboard',
        data: { savedObjectId: 'dash-id', title: 'My dash' },
      };
      const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
      expect(out.isUnified).toBe(true);
      if (out.isUnified) {
        expect(out.attributes.type).toBe('dashboard');
      }
    });

    it('returns unified for a lens SO-ref attachment even when mode is legacy', () => {
      const attrs = {
        ...commonAttrs,
        type: 'lens',
        attachmentId: 'lens-so-id',
        metadata: { title: 'Saved viz', soType: 'lens' },
      };
      const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
      expect(out.isUnified).toBe(true);
    });

    it('returns unified for a map attachment even when mode is legacy', () => {
      const attrs = {
        ...commonAttrs,
        type: 'map',
        data: { savedObjectId: 'map-id', title: 'My map' },
      };
      const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
      expect(out.isUnified).toBe(true);
    });

    it('returns unified for a discoverSession attachment even when mode is legacy', () => {
      const attrs = {
        ...commonAttrs,
        type: 'discoverSession',
        attachmentId: 'search-id',
        metadata: { title: 'My search', soType: 'search' },
      };
      const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
      expect(out.isUnified).toBe(true);
    });
  });
});
