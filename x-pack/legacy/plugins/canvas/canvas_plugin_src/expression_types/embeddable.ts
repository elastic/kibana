/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionType } from '../../../../../../src/plugins/data/common/expressions';
// @ts-ignore Untyped Local
import { MAP_SAVED_OBJECT_TYPE } from '../../../maps/common/constants';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/search_embeddable';
// TODO: Doing this visualize import makes type_check fail
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable';
import { EmbeddableInput } from '../../../../../../src/legacy/core_plugins/embeddable_api/public';

export const EmbeddableExpressionType = 'embeddable';

export const EmbeddableTypes = {
  map: MAP_SAVED_OBJECT_TYPE,
  search: SEARCH_EMBEDDABLE_TYPE,
  visualization: VISUALIZE_EMBEDDABLE_TYPE,
};

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
