/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { resolveArtifactId } from './resolve_artifact_id';

describe('resolveArtifactId', () => {
  it('keeps an existing id', () => {
    expect(resolveArtifactId(RUNBOOK_ARTIFACT_TYPE, 'runbook-1')).toBe('runbook-1');
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['blank', '   '],
  ])('generates a prefixed id when the existing id is %s', (_label, existingId) => {
    expect(resolveArtifactId(RUNBOOK_ARTIFACT_TYPE, existingId)).toMatch(/^runbook-.+/);
    expect(resolveArtifactId(DASHBOARD_ARTIFACT_TYPE, existingId)).toMatch(/^dashboard-.+/);
  });
});
