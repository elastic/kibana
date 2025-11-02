/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';
import { transformLayersOut } from './transform_layers_out';

describe('transformLayersOut', () => {
  test('should remove columns from ESQLSourceDescriptor', () => {
    expect(
      transformLayersOut([
        {
          sourceDescriptor: {
            type: SOURCE_TYPES.ESQL,
            columns: [],
            esql: 'from kibana_sample_data_logs | keep geo.coordinates',
          } as any,
        },
      ])
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "sourceDescriptor": Object {
            "esql": "from kibana_sample_data_logs | keep geo.coordinates",
            "type": "ESQL",
          },
        },
      ]
    `);
  });
});
