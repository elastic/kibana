/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import {
  embeddableInputToExpression,
  inputToExpressionTypeMap,
} from './embeddable_input_to_expression';

const input = {
  id: 'embeddableId',
  filters: [],
  hideFilterActions: true as true,
};

describe('input to expression', () => {
  it('converts to expression if method is available', () => {
    const newType = 'newType';
    const mockReturn = 'expression';
    inputToExpressionTypeMap[newType] = jest.fn().mockReturnValue(mockReturn);

    const expression = embeddableInputToExpression(
      input,
      newType,
      chartPluginMock.createPaletteRegistry()
    );

    expect(expression).toBe(mockReturn);
  });
});
