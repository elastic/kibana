/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFleetIndex, isOsqueryIndex, shouldUseInternalSearchClient } from './cps_read_routing';

describe('cps_read_routing', () => {
  describe('isFleetIndex', () => {
    it('matches fleet indices', () => {
      expect(isFleetIndex('.fleet-actions')).toBe(true);
      expect(isFleetIndex('.fleet-actions-results*')).toBe(true);
      expect(isFleetIndex('.fleet-agents')).toBe(true);
    });

    it('does not match osquery indices', () => {
      expect(isFleetIndex('.logs-osquery_manager.actions-default')).toBe(false);
      expect(isFleetIndex('logs-osquery_manager.result-prod')).toBe(false);
    });
  });

  describe('isOsqueryIndex', () => {
    it('matches action metadata, result and response indices', () => {
      expect(isOsqueryIndex('.logs-osquery_manager.actions-default')).toBe(true);
      expect(isOsqueryIndex('*:logs-osquery_manager.actions-prod')).toBe(true);
      expect(isOsqueryIndex('logs-osquery_manager.result-prod')).toBe(true);
      expect(isOsqueryIndex('logs-osquery_manager.action.responses-prod')).toBe(true);
      expect(isOsqueryIndex('.logs-osquery_manager.action.responses-default')).toBe(true);
    });

    it('does not match fleet indices', () => {
      expect(isOsqueryIndex('.fleet-actions')).toBe(false);
      expect(isOsqueryIndex('.fleet-actions-results*')).toBe(false);
    });
  });

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
