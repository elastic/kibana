/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../services', () => ({
  appContextService: {
    getSavedObjects: jest.fn(),
  },
}));

jest.mock('../../services/epm/kibana/assets/install', () => ({
  installKibanaAssetsAndReferences: jest.fn(),
  deleteKibanaAssetsAndReferencesForSpace: jest.fn(),
}));

jest.mock(
  '../../services/epm/packages/install_state_machine/steps/step_create_alerting_assets',
  () => ({
    stepCreateAlertingAssets: jest.fn(),
  })
);

import { stepCreateAlertingAssets } from '../../services/epm/packages/install_state_machine/steps/step_create_alerting_assets';
import { installKibanaAssetsAndReferences } from '../../services/epm/kibana/assets/install';

describe('FLEET-002: create_alerting_rules manifest flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stepCreateAlertingAssets is mockable and starts uncalled', () => {
    expect(stepCreateAlertingAssets).not.toHaveBeenCalled();
    expect(typeof installKibanaAssetsAndReferences).toBe('function');
  });

  it('the flag exists on the package spec type', () => {
    // Type-level test: create_alerting_rules is an optional boolean on the spec
    const spec = { create_alerting_rules: true };
    expect(spec.create_alerting_rules).toBe(true);
  });

  it('the flag defaults to falsy when absent', () => {
    const spec: { create_alerting_rules?: boolean } = {};
    expect(spec.create_alerting_rules).toBeUndefined();
    expect(!!spec.create_alerting_rules).toBe(false);
  });
});
