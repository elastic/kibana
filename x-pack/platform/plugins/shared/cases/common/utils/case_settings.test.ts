/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseSettings } from './case_settings';

describe('getCaseSettings', () => {
  it('returns Security owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('securitySolution')).toEqual({
      syncAlerts: true,
      extractObservables: true,
      observablesEnabled: true,
    });
  });

  it('returns Stack owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('cases')).toEqual({
      syncAlerts: false,
      extractObservables: false,
      observablesEnabled: true,
    });
  });

  it('returns Observability owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('observability')).toEqual({
      syncAlerts: false,
      extractObservables: false,
      observablesEnabled: false,
    });
  });

  it.each([[''], ['foobar'], ['toString'], ['constructor']])(
    'defaults every flag off for unknown owner %j',
    (owner) => {
      expect(getCaseSettings(owner)).toEqual({
        syncAlerts: false,
        extractObservables: false,
        observablesEnabled: false,
      });
    }
  );
});
