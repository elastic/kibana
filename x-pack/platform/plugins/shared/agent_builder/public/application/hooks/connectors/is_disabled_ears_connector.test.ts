/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDisabledEarsConnector } from './is_disabled_ears_connector';

const earsConnector = { config: { authType: 'ears' }, isEarsExperimental: true };
const flagsOn = { isEarsEnabled: true, isEarsExperimentalEnabled: true };

describe('isDisabledEarsConnector', () => {
  it('is false when EARS is enabled for a non-experimental type', () => {
    expect(isDisabledEarsConnector({ config: { authType: 'ears' } }, flagsOn)).toBe(false);
  });

  it('is true when EARS is disabled', () => {
    expect(
      isDisabledEarsConnector(earsConnector, {
        isEarsEnabled: false,
        isEarsExperimentalEnabled: true,
      })
    ).toBe(true);
  });

  it('is true when the type is experimental and experimental EARS is off', () => {
    expect(
      isDisabledEarsConnector(earsConnector, {
        isEarsEnabled: true,
        isEarsExperimentalEnabled: false,
      })
    ).toBe(true);
  });

  it('is false for non-EARS connectors', () => {
    expect(isDisabledEarsConnector({ config: { authType: 'api_key' } }, flagsOn)).toBe(false);
  });
});
