/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  FieldBasedIndexPatternColumn,
  MinIndexPatternColumn,
  SumIndexPatternColumn,
  AvgIndexPatternColumn,
  MaxIndexPatternColumn,
} from '../indexpattern';
import { OperationDefinition } from '../operations';

function buildMetricOperation<T extends FieldBasedIndexPatternColumn>(
  type: T['operationType'],
  displayName: string,
  ofName: (name: string) => string
) {
  const operationDefinition: OperationDefinition<T> = {
    type,
    displayName,
    getPossibleOperationsForDocument: () => [],
    getPossibleOperationsForField: ({ aggregationRestrictions, type: fieldType }) => {
      if (fieldType === 'number' && (!aggregationRestrictions || aggregationRestrictions[type])) {
        return [
          {
            dataType: 'number',
            isBucketed: false,
          },
        ];
      }
      return [];
    },
    buildColumn({ suggestedPriority, field }): T {
      if (!field) {
        throw new Error(`Invariant: A ${type} operation can only be built with a field`);
      }
      return {
        label: ofName(field ? field.name : ''),
        dataType: 'number',
        operationType: type,
        suggestedPriority,
        sourceField: field ? field.name : '',
        isBucketed: false,
      } as T;
    },
    toEsAggsConfig: (column, columnId) => ({
      id: columnId,
      enabled: true,
      type: column.operationType,
      schema: 'metric',
      params: {
        field: column.sourceField,
      },
    }),
  };
  return operationDefinition;
}

export const minOperation = buildMetricOperation<MinIndexPatternColumn>(
  'min',
  i18n.translate('xpack.lens.indexPattern.min', {
    defaultMessage: 'Minimum',
  }),
  name =>
    i18n.translate('xpack.lens.indexPattern.minOf', {
      defaultMessage: 'Minimum of {name}',
      values: { name },
    })
);

export const maxOperation = buildMetricOperation<MaxIndexPatternColumn>(
  'max',
  i18n.translate('xpack.lens.indexPattern.max', {
    defaultMessage: 'Maximum',
  }),
  name =>
    i18n.translate('xpack.lens.indexPattern.maxOf', {
      defaultMessage: 'Maximum of {name}',
      values: { name },
    })
);

export const averageOperation = buildMetricOperation<AvgIndexPatternColumn>(
  'avg',
  i18n.translate('xpack.lens.indexPattern.avg', {
    defaultMessage: 'Average',
  }),
  name =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    })
);

export const sumOperation = buildMetricOperation<SumIndexPatternColumn>(
  'sum',
  i18n.translate('xpack.lens.indexPattern.sum', {
    defaultMessage: 'Sum',
  }),
  name =>
    i18n.translate('xpack.lens.indexPattern.sumOf', {
      defaultMessage: 'Sum of {name}',
      values: { name },
    })
);
