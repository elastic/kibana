/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * It's a JS file because we cannot use Jest types in here because of a clash in the `expect` types
 */

import { assertTelemetryPayload } from './schema_to_config_schema';

describe(`assertTelemetryPayload`, () => {
  test('empty schemas => errors with malformed schema', () => {
    // @ts-expect-error: root and plugins don't match expected types
    expect(() => assertTelemetryPayload({ root: {}, plugins: {} }, {})).toThrow(/Malformed schema/);
  });
  test('minimal schemas and empty stats => pass', () => {
    expect(() =>
      // @ts-expect-error: root doesn't match expected types
      assertTelemetryPayload({ root: {}, plugins: { properties: {} } }, {})
    ).not.toThrow();
  });
  test('stats has fields not defined in the schema => fail', () => {
    expect(() =>
      // @ts-expect-error: root doesn't match expected types
      assertTelemetryPayload({ root: {}, plugins: { properties: {} } }, { version: 'some-version' })
    ).toThrow('[version]: definition for this key is missing. Received `"some-version"`');
  });
  test('stats has nested-fields not defined in the schema => fail', () => {
    expect(() =>
      assertTelemetryPayload(
        // @ts-expect-error: root doesn't match expected types
        { root: {}, plugins: { properties: {} } },
        { an_array: [{ docs: { missing: 1 } }] }
      )
    ).toThrow(
      '[an_array]: definition for this key is missing. Received `[{"docs":{"missing":1}}]`'
    );
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              an_array: {
                type: 'array',
                items: {
                  properties: {},
                },
              },
            },
          },
          plugins: { properties: {} },
        },
        { an_array: [{ docs: { missing: 1 } }] }
      )
    ).toThrow('[an_array.0.docs]: definition for this key is missing. Received `{"missing":1}`');
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              an_array: {
                type: 'array',
                items: {
                  properties: {
                    docs: {
                      properties: {},
                    },
                  },
                },
              },
            },
          },
          plugins: { properties: {} },
        },
        { an_array: [{ docs: { missing: 1 } }] }
      )
    ).toThrow('[an_array.0.docs.missing]: definition for this key is missing. Received `1`');
  });
  test('stats has nested-fields defined in the schema, but with wrong type => fail', () => {
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              an_array: {
                type: 'array',
                items: {
                  properties: {
                    docs: {
                      properties: {
                        field: { type: 'short' },
                      },
                    },
                  },
                },
              },
            },
          },
          plugins: { properties: {} },
        },
        { an_array: [{ docs: { field: 'abc' } }] }
      )
    ).toThrow(`[an_array.0.docs.field]: types that failed validation:
- [an_array.0.docs.field.0]: expected value of type [number] but got [string]
- [an_array.0.docs.field.1]: expected value to equal [null]`);
  });
  test('stats has nested-fields defined in the schema => succeed', () => {
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              an_array: {
                type: 'array',
                items: {
                  properties: {
                    docs: {
                      properties: {
                        field: { type: 'short' },
                      },
                    },
                  },
                },
              },
            },
          },
          plugins: { properties: {} },
        },
        { an_array: [{ docs: { field: 1 } }] }
      )
    ).not.toThrow();
  });

  test('allow pass_through properties', () => {
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              im_only_passing_through_data: {
                type: 'pass_through',
              },
            },
          },
          plugins: { properties: {} },
        },
        { im_only_passing_through_data: [{ docs: { field: 1 } }] }
      )
    ).not.toThrow();

    // Even when properties exist
    expect(() =>
      assertTelemetryPayload(
        {
          root: {
            properties: {
              im_only_passing_through_data: {
                type: 'pass_through',
                properties: {},
              },
            },
          },
          plugins: { properties: {} },
        },
        { im_only_passing_through_data: [{ docs: { field: 1 } }] }
      )
    ).not.toThrow();
  });
});
