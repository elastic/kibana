/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression as genericToExpression } from './input_type_to_expression/embeddable';

/*
  Take the input from an embeddable and the type of embeddable and convert it into an expression
*/
export function embeddableInputToExpression(state: object, embeddableType: string): string {
  return genericToExpression(state, embeddableType);
}
