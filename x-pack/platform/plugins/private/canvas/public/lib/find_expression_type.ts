/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRegistry } from '../expression_types/transform_registry';
import { modelRegistry } from '../expression_types/model_registry';
import { viewRegistry } from '../expression_types/view_registry';
import type { ArgType, ExpressionType } from '../expression_types/types';

const expressionTypes: ArgType[] = ['view', 'model', 'transform', 'datasource'];

export function findExpressionType(name: string, type?: ArgType | null) {
  const checkTypes = expressionTypes.filter(
    (expressionType) => type == null || expressionType === type
  );

  const matches = checkTypes.reduce((acc: ExpressionType[], checkType) => {
    let expression;
    switch (checkType) {
      case 'view':
        expression = viewRegistry.get(name);
        return !expression ? acc : acc.concat(expression);
      case 'model':
        expression = modelRegistry.get(name);
        return !expression ? acc : acc.concat(expression);
      case 'transform':
        expression = transformRegistry.get(name);
        return !expression ? acc : acc.concat(expression);
      default:
        return acc;
    }
  }, []);

  if (matches.length > 1) {
    throw new Error(`Found multiple expressions with name "${name}"`);
  }
  return matches[0] || null;
}
