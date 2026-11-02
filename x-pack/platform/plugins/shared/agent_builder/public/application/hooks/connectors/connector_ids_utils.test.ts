/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentHasConnector, getEffectiveConnectorIds } from './connector_ids_utils';

describe('agentHasConnector', () => {
  it('returns false when connector_ids is undefined (no connectors assigned)', () => {
    expect(agentHasConnector({ configuration: { connector_ids: undefined } }, 'c1')).toBe(false);
  });

  it('returns false when connector_ids is null (no connectors assigned)', () => {
    expect(agentHasConnector({ configuration: { connector_ids: null } }, 'c1')).toBe(false);
  });

  it('returns false when connector_ids is absent (no configuration)', () => {
    expect(agentHasConnector({ configuration: undefined }, 'c1')).toBe(false);
  });

  it('returns true when connector is in the explicit list', () => {
    expect(agentHasConnector({ configuration: { connector_ids: ['c1', 'c2'] } }, 'c1')).toBe(true);
  });

  it('returns false when connector is not in the explicit list', () => {
    expect(agentHasConnector({ configuration: { connector_ids: ['c2', 'c3'] } }, 'c1')).toBe(false);
  });

  it('returns false when connector_ids is an empty array', () => {
    expect(agentHasConnector({ configuration: { connector_ids: [] } }, 'c1')).toBe(false);
  });
});

describe('getEffectiveConnectorIds', () => {
  it('returns empty array when connector_ids is undefined (no connectors assigned)', () => {
    expect(getEffectiveConnectorIds({ configuration: { connector_ids: undefined } })).toEqual([]);
  });

  it('returns empty array when connector_ids is null (no connectors assigned)', () => {
    expect(getEffectiveConnectorIds({ configuration: { connector_ids: null } })).toEqual([]);
  });

  it('returns empty array when configuration is absent', () => {
    expect(getEffectiveConnectorIds({ configuration: undefined })).toEqual([]);
  });

  it('returns the explicit list when connector_ids is set', () => {
    expect(getEffectiveConnectorIds({ configuration: { connector_ids: ['c1', 'c3'] } })).toEqual([
      'c1',
      'c3',
    ]);
  });

  it('returns an empty array when connector_ids is []', () => {
    expect(getEffectiveConnectorIds({ configuration: { connector_ids: [] } })).toEqual([]);
  });
});
