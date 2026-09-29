/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../types';
import { isConnectorTypeTestable } from './is_connector_type_testable';

const baseActionType = (): ActionType => ({
  id: 'test',
  name: 'Test',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  isSystemActionType: false,
  isDeprecated: false,
});

describe('isConnectorTypeTestable', () => {
  it('returns false when action type is undefined', () => {
    expect(isConnectorTypeTestable(undefined)).toBe(false);
  });

  it('returns true for stack connectors', () => {
    expect(
      isConnectorTypeTestable({ ...baseActionType(), source: ACTION_TYPE_SOURCES.stack })
    ).toBe(true);
  });

  it('returns true for spec connectors with isTestable true', () => {
    expect(
      isConnectorTypeTestable({
        ...baseActionType(),
        source: ACTION_TYPE_SOURCES.spec,
        isTestable: true,
      })
    ).toBe(true);
  });

  it('returns false for spec connectors with isTestable false', () => {
    expect(
      isConnectorTypeTestable({
        ...baseActionType(),
        source: ACTION_TYPE_SOURCES.spec,
        isTestable: false,
      })
    ).toBe(false);
  });

  it('returns false for yml connectors without isTestable', () => {
    expect(isConnectorTypeTestable({ ...baseActionType(), source: ACTION_TYPE_SOURCES.yml })).toBe(
      false
    );
  });
});
