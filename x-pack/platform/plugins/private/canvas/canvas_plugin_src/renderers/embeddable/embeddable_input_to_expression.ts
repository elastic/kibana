/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteRegistry } from '@kbn/coloring';
import { EmbeddableTypes, EmbeddableInput } from '../../expression_types';
import { toExpression as mapToExpression } from './input_type_to_expression/map';
import { toExpression as visualizationToExpression } from './input_type_to_expression/visualization';
import { toExpression as lensToExpression } from './input_type_to_expression/lens';
import { toExpression as genericToExpression } from './input_type_to_expression/embeddable';

export const inputToExpressionTypeMap = {
  [EmbeddableTypes.map]: mapToExpression,
  [EmbeddableTypes.visualization]: visualizationToExpression,
  [EmbeddableTypes.lens]: lensToExpression,
};

/*
  Take the input from an embeddable and the type of embeddable and convert it into an expression
*/
export function embeddableInputToExpression<
  UseGenericEmbeddable extends boolean,
  ConditionalReturnType = UseGenericEmbeddable extends true ? string : string | undefined
>(
  input: Omit<EmbeddableInput, 'id'>,
  embeddableType: string,
  palettes?: PaletteRegistry,
  useGenericEmbeddable?: UseGenericEmbeddable
): ConditionalReturnType {
  // if `useGenericEmbeddable` is `true`, it **always** returns a string
  if (useGenericEmbeddable) {
    return genericToExpression(input, embeddableType) as ConditionalReturnType;
  }

  // otherwise, depending on if the embeddable type is defined, it might return undefined
  if (inputToExpressionTypeMap[embeddableType]) {
    return inputToExpressionTypeMap[embeddableType](
      input as any,
      palettes
    ) as ConditionalReturnType;
  }

  return undefined as ConditionalReturnType;
}
