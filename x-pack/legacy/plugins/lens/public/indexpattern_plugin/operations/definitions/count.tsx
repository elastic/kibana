/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from '.';
import { ParameterlessIndexPatternColumn, BaseIndexPatternColumn } from './column_types';
import { IndexPatternField } from '../../types';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of records',
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
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.name,
      sourceField: field.name,
    };
  },
  getPossibleOperationForField: (field: IndexPatternField) => {
    if (field.type === 'document') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  buildColumn({ suggestedPriority, field }) {
    return {
      label: countLabel,
      dataType: 'number',
      operationType: 'count',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      sourceField: field.name,
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
