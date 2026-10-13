/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiDocument } from './http_api/knowledge_indicators';
import { readKiDocumentLifecycleStatus, toOptionalKiLifecycleStatus } from './ki_lifecycle_status';

describe('toOptionalKiLifecycleStatus', () => {
  it('returns known statuses', () => {
    expect(toOptionalKiLifecycleStatus('active')).toBe('active');
    expect(toOptionalKiLifecycleStatus('deleted')).toBe('deleted');
  });

  it('returns undefined for other values', () => {
    expect(toOptionalKiLifecycleStatus('archived')).toBeUndefined();
    expect(toOptionalKiLifecycleStatus('')).toBeUndefined();
    expect(toOptionalKiLifecycleStatus(null)).toBeUndefined();
  });
});

describe('readKiDocumentLifecycleStatus', () => {
  it('reads governance.lifecycle.status when present', () => {
    const document: KiDocument = {
      governance: { lifecycle: { status: 'deleted' } },
    };
    expect(readKiDocumentLifecycleStatus(document)).toBe('deleted');
  });

  it('returns undefined when governance is missing or malformed', () => {
    expect(readKiDocumentLifecycleStatus({})).toBeUndefined();
    expect(readKiDocumentLifecycleStatus({ governance: [] })).toBeUndefined();
    expect(
      readKiDocumentLifecycleStatus({ governance: { lifecycle: { status: 'pending' } } })
    ).toBeUndefined();
  });
});
