/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from '.';
import { ParameterlessIndexPatternColumn, BaseIndexPatternColumn } from './column_types';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of documents',
});

export type CountIndexPatternColumn = ParameterlessIndexPatternColumn<
  'count',
  BaseIndexPatternColumn
>;

export const countOperation: OperationDefinition<CountIndexPatternColumn> = {
  type: 'count',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Count',
  }),
  getPossibleOperationForDocument: () => {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  buildColumn({ suggestedPriority }) {
    return {
      label: countLabel,
      dataType: 'number',
      operationType: 'count',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'count',
    schema: 'metric',
    params: {},
  }),
  isTransferable: () => {
    return true;
  },
};
