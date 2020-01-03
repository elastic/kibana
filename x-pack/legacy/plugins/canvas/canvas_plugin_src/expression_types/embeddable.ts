/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionType } from 'src/plugins/expressions/public';
import { EmbeddableInput } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { EmbeddableTypes } from './embeddable_types';

export const EmbeddableExpressionType = 'embeddable';
export { EmbeddableTypes, EmbeddableInput };

export interface EmbeddableExpression<Input extends EmbeddableInput> {
  type: typeof EmbeddableExpressionType;
  input: Input;
  embeddableType: string;
}

export const embeddableType = (): ExpressionType<
  typeof EmbeddableExpressionType,
  EmbeddableExpression<any>
> => ({
  name: EmbeddableExpressionType,
  to: {
    render: (embeddableExpression: EmbeddableExpression<any>) => {
      return {
        type: 'render',
        as: EmbeddableExpressionType,
        value: embeddableExpression,
      };
    },
  },
});
