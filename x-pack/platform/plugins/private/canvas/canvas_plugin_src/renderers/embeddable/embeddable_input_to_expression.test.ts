/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { embeddableInputToExpression } from './embeddable_input_to_expression';

const input = {
  id: 'embeddableId',
  filters: [],
  hideFilterActions: true as true,
};

describe('embeddableInputToExpression', () => {
  it('converts input to a generic embeddable expression', () => {
    const expression = embeddableInputToExpression(input, 'lens');
    expect(expression).toMatch(/^embeddable config=".*" type="lens" \| render$/);

    const expression = embeddableInputToExpression(input, 'visualization');
    expect(expression).toMatch(/^embeddable config=".*" type="visualization" \| render$/);

    const expression = embeddableInputToExpression(input, 'map');
    expect(expression).toMatch(/^embeddable config=".*" type="map" \| render$/);

    const expression = embeddableInputToExpression(input, 'search');
    expect(expression).toMatch(/^embeddable config=".*" type="search" \| render$/);
  });
});
