/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema } from './config';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

describe('config schema', () => {
  it('generates proper defaults (no overrides)', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`Object {}`);
    expect(ConfigSchema.validate({}, { serverless: true })).toMatchInlineSnapshot(`Object {}`);
  });

  it('does not allow overrides in non-serverless', () => {
    expect(() =>
      ConfigSchema.validate(
        { overrides: { featureA: { name: 'new name' } } },
        { serverless: false }
      )
    ).toThrowErrorMatchingInlineSnapshot(`"[overrides]: a value wasn't expected to be present"`);
    expect(
      ConfigSchema.validate({ overrides: { featureA: { name: 'new name' } } }, { serverless: true })
    ).toMatchInlineSnapshot(`
      Object {
        "overrides": Object {
          "featureA": Object {
            "name": "new name",
          },
        },
      }
    `);
  });

  it('can override feature properties', () => {
    expect(
      ConfigSchema.validate(
        {
          overrides: {
            featureA: { name: 'new name', hidden: true },
            featureB: {
              order: 100,
              category: 'management',
              privileges: {
                all: {
                  disabled: true,
                },
                read: {
                  composedOf: [{ feature: 'featureC', privileges: ['all', 'read'] }],
                },
              },
            },
            featureC: {
              subFeatures: {
                privileges: {
                  subOne: {
                    disabled: true,
                    includeIn: 'all',
                  },
                  subTwo: {
                    includeIn: 'none',
                  },
                },
              },
            },
          },
        },
        { serverless: true }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "overrides": Object {
          "featureA": Object {
            "hidden": true,
            "name": "new name",
          },
          "featureB": Object {
            "category": "management",
            "order": 100,
            "privileges": Object {
              "all": Object {
                "disabled": true,
              },
              "read": Object {
                "composedOf": Array [
                  Object {
                    "feature": "featureC",
                    "privileges": Array [
                      "all",
                      "read",
                    ],
                  },
                ],
              },
            },
          },
          "featureC": Object {
            "subFeatures": Object {
              "privileges": Object {
                "subOne": Object {
                  "disabled": true,
                  "includeIn": "all",
                },
                "subTwo": Object {
                  "includeIn": "none",
                },
              },
            },
          },
        },
      }
    `);
  });

  it('properly validates category override', () => {
    for (const category of Object.keys(DEFAULT_APP_CATEGORIES)) {
      expect(
        ConfigSchema.validate({ overrides: { featureA: { category } } }, { serverless: true })
          .overrides?.featureA.category
      ).toBe(category);
    }

    expect(() =>
      ConfigSchema.validate(
        { overrides: { featureA: { category: 'unknown' } } },
        { serverless: true }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"[overrides.featureA.category]: Unknown category \\"unknown\\". Should be one of kibana, enterpriseSearch, observability, security, management"`
    );
  });
  it('properly validates sub-feature privilege inclusion override', () => {
    for (const includeIn of ['all', 'read', 'none']) {
      expect(
        ConfigSchema.validate(
          { overrides: { featureA: { subFeatures: { privileges: { subOne: { includeIn } } } } } },
          { serverless: true }
        ).overrides?.featureA.subFeatures?.privileges.subOne.includeIn
      ).toBe(includeIn);
    }

    expect(() =>
      ConfigSchema.validate(
        {
          overrides: {
            featureA: { subFeatures: { privileges: { subOne: { includeIn: 'write' } } } },
          },
        },
        { serverless: true }
      )
    ).toThrowErrorMatchingInlineSnapshot(`
      "[overrides.featureA.subFeatures.privileges.subOne.includeIn]: types that failed validation:
      - [includeIn.0]: expected value to equal [all]
      - [includeIn.1]: expected value to equal [read]
      - [includeIn.2]: expected value to equal [none]"
    `);
  });
});
