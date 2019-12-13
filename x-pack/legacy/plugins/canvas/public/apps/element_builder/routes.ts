/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import { ElementBuilderApp } from './element_builder_app';

interface ElementBuilderParams {
  params: {
    encodedExpression?: string;
  };
}

export const routes = [
  {
    name: 'elementBuilder',
    path: '/builder',
    children: [
      {
        name: 'empty',
        path: '/',
        meta: {
          component: ElementBuilderApp,
        },
      },
      {
        name: 'provided',
        path: '/:encodedExpression',
        action: (dispatch: Dispatch) => ({ params }: ElementBuilderParams) => {
          try {
            const { encodedExpression } = params;
            if (encodedExpression) {
              const expression = atob(encodedExpression + '==');
              if (expression) {
                // dispatch(setExpression(expression));
              }
            }
          } catch {
            // ignore
          }
        },
        meta: {
          component: ElementBuilderApp,
        },
      },
    ],
  },
];
