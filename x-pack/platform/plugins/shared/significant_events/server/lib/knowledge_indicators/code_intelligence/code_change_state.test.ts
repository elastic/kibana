/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CODE_ANALYSIS_FEATURE_TYPE, type BaseFeature } from '@kbn/significant-events-schema';
import { CODE_FEATURE_SUBTYPE_REPO_TYPE } from './constants';
import { buildCodeChangeMeta, isUnchanged, readCodeChangeState } from './code_change_state';

const repoTypeFeature = (meta: Record<string, unknown>): BaseFeature => ({
  id: CODE_FEATURE_SUBTYPE_REPO_TYPE,
  stream_name: 'logs.checkout',
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: CODE_FEATURE_SUBTYPE_REPO_TYPE,
  description: 'repo type',
  properties: {},
  confidence: 90,
  meta,
});

describe('readCodeChangeState', () => {
  it('reads repository + fingerprint from the repo_type feature meta', () => {
    const state = readCodeChangeState([
      repoTypeFeature({ repository: 'acme/checkout', change_fingerprint: 'sha1' }),
    ]);
    expect(state).toEqual({ repository: 'acme/checkout', fingerprint: 'sha1' });
  });

  it('returns empty state when no repo_type feature exists', () => {
    expect(readCodeChangeState([])).toEqual({ repository: undefined, fingerprint: undefined });
  });
});

describe('buildCodeChangeMeta', () => {
  it('omits the fingerprint when unavailable', () => {
    expect(buildCodeChangeMeta({ repository: 'acme/checkout', fingerprint: undefined })).toEqual({
      repository: 'acme/checkout',
    });
  });

  it('includes the fingerprint when present', () => {
    expect(buildCodeChangeMeta({ repository: 'acme/checkout', fingerprint: 'sha1' })).toEqual({
      repository: 'acme/checkout',
      change_fingerprint: 'sha1',
    });
  });
});

describe('isUnchanged', () => {
  it('is true only when both fingerprints exist and match', () => {
    expect(isUnchanged({ fingerprint: 'sha1' }, 'sha1')).toBe(true);
    expect(isUnchanged({ fingerprint: 'sha1' }, 'sha2')).toBe(false);
  });

  it('treats missing fingerprints as changed', () => {
    expect(isUnchanged({ fingerprint: undefined }, 'sha1')).toBe(false);
    expect(isUnchanged({ fingerprint: 'sha1' }, undefined)).toBe(false);
  });
});
