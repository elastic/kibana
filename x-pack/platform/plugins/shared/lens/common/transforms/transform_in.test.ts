/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { getTransformIn } from './transform_in';

const esql = 'FROM index | LIMIT 10';

const getTextBasedByValueConfig = () => ({
  attributes: {
    title: 'my chart',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: undefined,
      filters: [],
      datasourceStates: {
        textBased: {
          layers: { layer1: { query: { esql }, columns: [] } },
        },
      },
      visualization: {},
    },
  },
});

const transformDrilldownsIn = (state: unknown) => ({ state, references: [] });

describe('getTransformIn', () => {
  it('mirrors the ES|QL layer query into the legacy slot on the dashboard-app by-value path (builder disabled)', () => {
    const builder = { isEnabled: false } as LensConfigBuilder;
    const transformIn = getTransformIn(builder, transformDrilldownsIn as never, true);

    const { state } = transformIn(getTextBasedByValueConfig() as never) as {
      state: { attributes: { state: { query: unknown } } };
    };

    expect(state.attributes.state.query).toEqual({ esql });
  });
});
