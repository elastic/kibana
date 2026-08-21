/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldUseInternalSearchClient } from './cps_read_routing';

describe('cps_read_routing', () => {
  describe('shouldUseInternalSearchClient', () => {
    it('keeps the legacy non-CPS selector', () => {
      expect(shouldUseInternalSearchClient(['logs-osquery_manager.result-prod'], false)).toBe(true);
      expect(shouldUseInternalSearchClient(['.logs-osquery_manager.actions-default'], false)).toBe(
        true
      );
      expect(shouldUseInternalSearchClient(['.fleet-actions*'], false)).toBe(true);
    });

    it('uses internal search for fleet indices when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['.fleet-actions*'], true)).toBe(true);
      expect(shouldUseInternalSearchClient(['.fleet-actions-results*'], true)).toBe(true);
      expect(shouldUseInternalSearchClient(['.fleet-agents'], true)).toBe(true);
    });

    it('uses internal search for CCS-prefixed fleet indices when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['remote:.fleet-actions'], true)).toBe(true);
      expect(shouldUseInternalSearchClient(['*:.fleet-actions-results*'], true)).toBe(true);
    });

    it('uses enhanced search for osquery action metadata when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['.logs-osquery_manager.actions-default'], true)).toBe(
        false
      );
      expect(shouldUseInternalSearchClient(['*:logs-osquery_manager.actions-prod'], true)).toBe(
        false
      );
    });

    it('uses enhanced search for osquery data indices when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['logs-osquery_manager.result-prod'], true)).toBe(false);
      expect(
        shouldUseInternalSearchClient(['logs-osquery_manager.action.responses-prod'], true)
      ).toBe(false);
      expect(
        shouldUseInternalSearchClient(['.logs-osquery_manager.action.responses-default'], true)
      ).toBe(false);
    });

    it('does not false-positive on osquery namespace suffixes containing "fleet" when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['logs-osquery_manager.result-myfleet'], true)).toBe(
        false
      );
      expect(
        shouldUseInternalSearchClient(['logs-osquery_manager.action.responses-myfleet'], true)
      ).toBe(false);
    });

    it('uses internal search when an osquery read also targets a fleet index', () => {
      expect(
        shouldUseInternalSearchClient(
          ['logs-osquery_manager.action.responses-prod', '.fleet-actions-results*'],
          true
        )
      ).toBe(true);
    });

    it('uses internal search for unrecognized indices when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient([], true)).toBe(true);
      expect(shouldUseInternalSearchClient(['some-other-index'], true)).toBe(true);
    });
  });
});
