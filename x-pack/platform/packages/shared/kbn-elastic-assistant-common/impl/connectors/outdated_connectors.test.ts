/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveConnectorId,
  ELASTIC_MANAGED_LLM_CONNECTOR_ID,
  GENERAL_PURPOSE_LLM_V1_CONNECTOR_ID,
  GENERAL_PURPOSE_LLM_V2_CONNECTOR_ID,
  LATEST_ELASTIC_MANAGED_CONNECTOR_ID,
} from './outdated_connectors';

describe('outdated_connectors', () => {
  describe('resolveConnectorId', () => {
    it('resolves ELASTIC_MANAGED_LLM_CONNECTOR_ID to LATEST_ELASTIC_MANAGED_CONNECTOR_ID', () => {
      expect(resolveConnectorId(ELASTIC_MANAGED_LLM_CONNECTOR_ID)).toBe(
        LATEST_ELASTIC_MANAGED_CONNECTOR_ID
      );
    });

    it('resolves GENERAL_PURPOSE_LLM_V1_CONNECTOR_ID to LATEST_ELASTIC_MANAGED_CONNECTOR_ID', () => {
      expect(resolveConnectorId(GENERAL_PURPOSE_LLM_V1_CONNECTOR_ID)).toBe(
        LATEST_ELASTIC_MANAGED_CONNECTOR_ID
      );
    });

    it('does not resolve GENERAL_PURPOSE_LLM_V2_CONNECTOR_ID', () => {
      expect(resolveConnectorId(GENERAL_PURPOSE_LLM_V2_CONNECTOR_ID)).toBe(
        GENERAL_PURPOSE_LLM_V2_CONNECTOR_ID
      );
    });

    it('returns the same connectorId if it is not outdated', () => {
      const connectorId = 'some-other-connector-id';
      expect(resolveConnectorId(connectorId)).toBe(connectorId);
    });

    it('returns LATEST_ELASTIC_MANAGED_CONNECTOR_ID if passed directly', () => {
      expect(resolveConnectorId(LATEST_ELASTIC_MANAGED_CONNECTOR_ID)).toBe(
        LATEST_ELASTIC_MANAGED_CONNECTOR_ID
      );
    });
  });
});
