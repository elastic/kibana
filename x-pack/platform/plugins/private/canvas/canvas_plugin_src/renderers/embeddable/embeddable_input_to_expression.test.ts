/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { encode } from '../../../common/lib/embeddable_dataurl';

const input = {
  id: 'embeddableId',
  filters: [],
  hideFilterActions: true as true,
};

describe('embeddableInputToExpression', () => {
  it('converts input to a generic embeddable expression', () => {
    const lensExpression = embeddableInputToExpression(input, 'lens');
    expect(lensExpression).toEqual(`embeddable config="${encode(input)}" type="lens" | render`);

    const visualizationExpression = embeddableInputToExpression(input, 'visualization');
    expect(visualizationExpression).toEqual(
      `embeddable config="${encode(input)}" type="visualization" | render`
    );

    const mapExpression = embeddableInputToExpression(input, 'map');
    expect(mapExpression).toEqual(`embeddable config="${encode(input)}" type="map" | render`);

    const searchExpression = embeddableInputToExpression(input, 'search');
    expect(searchExpression).toEqual(`embeddable config="${encode(input)}" type="search" | render`);
  });
});
