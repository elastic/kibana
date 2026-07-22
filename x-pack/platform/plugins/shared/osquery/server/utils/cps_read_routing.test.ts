/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isOsqueryActionsMetadataIndex,
  isOsqueryDataIndex,
  shouldUseInternalSearchClient,
} from './cps_read_routing';

describe('cps_read_routing', () => {
  describe('isOsqueryActionsMetadataIndex', () => {
    it('matches osquery actions metadata indices', () => {
      expect(isOsqueryActionsMetadataIndex('.logs-osquery_manager.actions-default')).toBe(true);
      expect(isOsqueryActionsMetadataIndex('*:logs-osquery_manager.actions-prod')).toBe(true);
    });

    it('does not match response data indices', () => {
      expect(isOsqueryActionsMetadataIndex('logs-osquery_manager.action.responses-prod')).toBe(
        false
      );
      expect(isOsqueryActionsMetadataIndex('.logs-osquery_manager.action.responses-default')).toBe(
        false
      );
    });
  });

  describe('isOsqueryDataIndex', () => {
    it('matches result and response data indices', () => {
      expect(isOsqueryDataIndex('logs-osquery_manager.result-prod')).toBe(true);
      expect(isOsqueryDataIndex('logs-osquery_manager.action.responses-prod')).toBe(true);
      expect(isOsqueryDataIndex('.logs-osquery_manager.action.responses-default')).toBe(true);
    });

    it('does not match fleet or actions metadata indices', () => {
      expect(isOsqueryDataIndex('.fleet-actions-results')).toBe(false);
      expect(isOsqueryDataIndex('.logs-osquery_manager.actions-default')).toBe(false);
    });
  });

  describe('shouldUseInternalSearchClient', () => {
    it('keeps the legacy non-CPS selector', () => {
      expect(
        shouldUseInternalSearchClient(['logs-osquery_manager.result-prod'], false)
      ).toBe(true);
      expect(shouldUseInternalSearchClient(['.fleet-actions*'], false)).toBe(true);
    });

    it('uses internal search for fleet indices when CPS is enabled', () => {
      expect(shouldUseInternalSearchClient(['.fleet-actions*'], true)).toBe(true);
    });

    it('uses internal search for actions metadata when CPS is enabled', () => {
      expect(
        shouldUseInternalSearchClient(['.logs-osquery_manager.actions-default'], true)
      ).toBe(true);
    });

    it('uses enhanced search for osquery data indices when CPS is enabled', () => {
      expect(
        shouldUseInternalSearchClient(['logs-osquery_manager.result-prod'], true)
      ).toBe(false);
      expect(
        shouldUseInternalSearchClient(['logs-osquery_manager.action.responses-prod'], true)
      ).toBe(false);
    });
  });
});
