/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ARTIFACT_TYPE,
  RUNBOOK_ARTIFACT_TYPE,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';
import { ArtifactTypeRegistry } from './artifact_type_registry';
import { registerBuiltinArtifactTypes } from './register_builtin_artifact_types';

describe('registerBuiltinArtifactTypes', () => {
  let registry: ArtifactTypeRegistry;

  const validate = (type: string, data: Record<string, unknown>) =>
    registry.validate([{ id: 'a1', type, data }]);

  beforeEach(() => {
    registry = new ArtifactTypeRegistry();
    registerBuiltinArtifactTypes(registry);
  });

  it('registers runbook and dashboard', () => {
    expect(registry.get(RUNBOOK_ARTIFACT_TYPE)).toBeDefined();
    expect(registry.get(DASHBOARD_ARTIFACT_TYPE)?.references).toEqual([
      { field: 'dashboardId', savedObjectType: 'dashboard' },
    ]);
  });

  it('accepts valid data', () => {
    expect(() => validate(RUNBOOK_ARTIFACT_TYPE, { content: '# Steps' })).not.toThrow();
    expect(() => validate(DASHBOARD_ARTIFACT_TYPE, { dashboardId: 'my-dashboard' })).not.toThrow();
  });

  describe('reports actionable messages', () => {
    it('names the offending field and the blank-string rule', () => {
      // A bare `.refine()` reports "Invalid input", which tells an API caller
      // nothing about what to change.
      expect(() => validate(RUNBOOK_ARTIFACT_TYPE, { content: '   ' })).toThrow(
        'content: must not be empty or contain only whitespace'
      );
      expect(() => validate(DASHBOARD_ARTIFACT_TYPE, { dashboardId: '' })).toThrow(
        'dashboardId: must not be empty or contain only whitespace'
      );
    });

    it('reports the blank-string rule once for an empty string', () => {
      try {
        validate(RUNBOOK_ARTIFACT_TYPE, { content: '' });
        throw new Error('expected validation to throw');
      } catch (error) {
        expect((error as Error).message).toBe(
          `Artifact "a1" of type "${RUNBOOK_ARTIFACT_TYPE}" has invalid data: content: must not be empty or contain only whitespace`
        );
      }
    });

    it('reports the limit that was exceeded', () => {
      expect(() =>
        validate(RUNBOOK_ARTIFACT_TYPE, { content: 'a'.repeat(RUNBOOK_CONTENT_LIMIT + 1) })
      ).toThrow(`expected string to have <=${RUNBOOK_CONTENT_LIMIT} characters`);
    });

    it('names an undeclared field', () => {
      expect(() => validate(RUNBOOK_ARTIFACT_TYPE, { content: 'ok', undeclared: 'x' })).toThrow(
        'Unrecognized key: "undeclared"'
      );
    });

    it('names a missing field', () => {
      expect(() => validate(DASHBOARD_ARTIFACT_TYPE, {})).toThrow(
        'dashboardId: Invalid input: expected string, received undefined'
      );
    });
  });
});
