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

import { ExpressionFunctionDefinition, Render } from 'src/plugins/expressions/public';
import { KibanaContext } from 'src/plugins/data/public';

export interface SelfChangingVisParams {
  counter: number;
}

export interface SelfChangingVisRenderValue {
  visParams: {
    counter: number;
  };
}

type Output = Promise<Render<SelfChangingVisRenderValue>>;

export type SelfChangingVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'self_changing_vis',
  KibanaContext,
  SelfChangingVisParams,
  Output
>;

export const selfChangingVisFn: SelfChangingVisExpressionFunctionDefinition = {
  name: 'self_changing_vis',
  type: 'render',
  inputTypes: ['kibana_context'],
  help:
    'The expression function definition should be registered for a custom visualization to be rendered',
  args: {
    counter: {
      types: ['number'],
      default: 0,
      help: 'Visualization only argument with type number',
    },
  },
  async fn(input, args) {
    /**
     * You can do any calculation you need before rendering.
     * The function can also do asynchronous operations, e.x.:
     *
        const calculatedCounter = await new Promise((resolve) =>
          setTimeout(() => {
            resolve(args.counter * 2);
          }, 3000)
        );
    */

    return {
      type: 'render',
      as: 'self_changing_vis',
      value: {
        visParams: {
          counter: args.counter,
        },
      },
    };
  },
};
