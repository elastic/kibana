/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  constants: jest.requireActual('crypto').constants,
}));

jest.mock('@kbn/utils', () => ({
  getLogsPath: () => '/mock/kibana/logs/path',
}));

import { ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "allowFeatureVisibility": true,
        "allowSolutionVisibility": true,
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);

    expect(ConfigSchema.validate({}, { dev: false })).toMatchInlineSnapshot(`
      Object {
        "allowFeatureVisibility": true,
        "allowSolutionVisibility": true,
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);

    expect(ConfigSchema.validate({}, { dev: true })).toMatchInlineSnapshot(`
      Object {
        "allowFeatureVisibility": true,
        "allowSolutionVisibility": true,
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);
  });

  it('should throw error if spaces is disabled', () => {
    expect(() => ConfigSchema.validate({ enabled: false })).toThrow(
      '[enabled]: Spaces can only be disabled in development mode'
    );

    expect(() => ConfigSchema.validate({ enabled: false }, { dev: false })).toThrow(
      '[enabled]: Spaces can only be disabled in development mode'
    );
  });

  it('should not throw error if spaces is disabled in development mode', () => {
    expect(() => ConfigSchema.validate({ enabled: false }, { dev: true })).not.toThrow();
  });

  it('should throw error if allowFeatureVisibility is disabled in classic offering', () => {
    expect(() => ConfigSchema.validate({ allowFeatureVisibility: false }, {})).toThrow();
  });

  it('should not throw error if allowFeatureVisibility and allowSolutionVisibility are disabled in serverless offering', () => {
    expect(() =>
      ConfigSchema.validate(
        { allowFeatureVisibility: false, allowSolutionVisibility: false },
        { serverless: true }
      )
    ).not.toThrow();
  });

  it('should not throw error if allowFeatureVisibility and allowSolutionVisibility are enabled in classic offering', () => {
    expect(() =>
      ConfigSchema.validate({ allowFeatureVisibility: true, allowSolutionVisibility: true }, {})
    ).not.toThrow();
  });

  it('should throw error if allowFeatureVisibility is enabled in serverless offering', () => {
    expect(() =>
      ConfigSchema.validate(
        { allowFeatureVisibility: true, allowSolutionVisibility: false },
        { serverless: true }
      )
    ).toThrow();
  });

  it('should throw error if allowSolutionVisibility is enabled in serverless offering', () => {
    expect(() =>
      ConfigSchema.validate(
        { allowSolutionVisibility: true, allowFeatureVisibility: false },
        { serverless: true }
      )
    ).toThrow();
  });
});
