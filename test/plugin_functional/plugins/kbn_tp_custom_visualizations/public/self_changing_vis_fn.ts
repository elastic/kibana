/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import { KibanaContext } from '@kbn/data-plugin/public';

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
  help: 'The expression function definition should be registered for a custom visualization to be rendered',
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
