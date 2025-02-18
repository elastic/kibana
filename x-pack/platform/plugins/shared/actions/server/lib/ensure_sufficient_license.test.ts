/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ActionType } from '../types';
import { ensureSufficientLicense } from './ensure_sufficient_license';

const sampleActionType: ActionType = {
  id: 'test',
  name: 'test',
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  validate: {
    config: { schema: schema.object({}) },
    secrets: { schema: schema.object({}) },
    params: { schema: schema.object({}) },
  },
  async executor({ actionId }) {
    return { status: 'ok', actionId };
  },
};

describe('ensureSufficientLicense()', () => {
  it('throws for licenses below gold', () => {
    expect(() => ensureSufficientLicense(sampleActionType)).toThrowErrorMatchingInlineSnapshot(
      `"Third party action type \\"test\\" can only set minimumLicenseRequired to a gold license or higher"`
    );
  });

  it('allows licenses below gold for allowed connectors', () => {
    expect(() =>
      ensureSufficientLicense({
        ...sampleActionType,
        id: '.server-log',
        minimumLicenseRequired: 'basic',
      })
    ).not.toThrow();
    expect(() =>
      ensureSufficientLicense({
        ...sampleActionType,
        id: '.index',
        minimumLicenseRequired: 'basic',
      })
    ).not.toThrow();
  });

  it('allows licenses at gold', () => {
    expect(() =>
      ensureSufficientLicense({ ...sampleActionType, minimumLicenseRequired: 'gold' })
    ).not.toThrow();
  });

  it('allows licenses above gold', () => {
    expect(() =>
      ensureSufficientLicense({ ...sampleActionType, minimumLicenseRequired: 'platinum' })
    ).not.toThrow();
  });

  it('throws when license type is invalid', async () => {
    expect(() =>
      ensureSufficientLicense({
        ...sampleActionType,
        // we're faking an invalid value, this requires stripping the typing

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        minimumLicenseRequired: 'foo' as any,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"\\"foo\\" is not a valid license type"`);
  });
});
