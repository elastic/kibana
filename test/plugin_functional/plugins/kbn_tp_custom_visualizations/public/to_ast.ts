/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
