/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { VisToExpressionAst } from 'src/plugins/visualizations/public';
import {
  buildExpression,
  buildExpressionFunction,
} from '../../../../../src/plugins/expressions/public';
import {
  SelfChangingVisExpressionFunctionDefinition,
  SelfChangingVisParams,
} from './self_changing_vis_fn';

export const toExpressionAst: VisToExpressionAst<SelfChangingVisParams> = (vis) => {
  const { counter } = vis.params;

  const selfChangingVis = buildExpressionFunction<SelfChangingVisExpressionFunctionDefinition>(
    'self_changing_vis',
    { counter }
  );

  const ast = buildExpression([selfChangingVis]);

  return ast.toAst();
};
