/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalSyncDirection } from '../types/domain';
import {
  pullsFromExternal,
  pushesToExternal,
  resolveExternalSyncFieldRules,
} from './external_sync_fields';

const DIRECTIONS: ExternalSyncDirection[] = ['both', 'push', 'pull', 'off'];

describe('external_sync_fields', () => {
  describe('resolveExternalSyncFieldRules', () => {
    it('returns the defaults when no rules are saved', () => {
      expect(resolveExternalSyncFieldRules()).toEqual({
        title: { direction: 'both' },
        description: { direction: 'both' },
        status: { direction: 'pull' },
        tags: { direction: 'push' },
        comments: { direction: 'push' },
      });
    });

    it('applies saved rules and keeps their conflict strategy', () => {
      expect(
        resolveExternalSyncFieldRules([
          { field: 'title', direction: 'pull', conflictStrategy: 'kibana' },
          { field: 'comments', direction: 'off' },
        ])
      ).toEqual({
        title: { direction: 'pull', conflictStrategy: 'kibana' },
        description: { direction: 'both' },
        status: { direction: 'pull' },
        tags: { direction: 'push' },
        comments: { direction: 'off' },
      });
    });

    it('falls back to the default when a saved direction is not supported by the field', () => {
      expect(
        resolveExternalSyncFieldRules([{ field: 'status', direction: 'push' }]).status
      ).toEqual({ direction: 'pull' });
    });
  });

  it('classifies directions', () => {
    expect(DIRECTIONS.map(pullsFromExternal)).toEqual([true, false, true, false]);
    expect(DIRECTIONS.map(pushesToExternal)).toEqual([true, true, false, false]);
  });
});
