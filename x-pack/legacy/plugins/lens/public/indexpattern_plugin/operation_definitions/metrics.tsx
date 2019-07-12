/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  IndexPatternField,
  FieldBasedIndexPatternColumn,
  MinIndexPatternColumn,
  SumIndexPatternColumn,
  AvgIndexPatternColumn,
  MaxIndexPatternColumn,
} from '../indexpattern';
import { DimensionLayer, DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';

function buildMetricOperation<T extends FieldBasedIndexPatternColumn>(
  type: T['operationType'],
  displayName: string,
  ofName: (name: string) => string
) {
  const operationDefinition: OperationDefinition<T> = {
    type,
    displayName,
    isApplicableWithoutField: false,
    isApplicableForField: ({ aggregationRestrictions, type: fieldType }: IndexPatternField) => {
      return Boolean(
        fieldType === 'number' && (!aggregationRestrictions || aggregationRestrictions[type])
      );
    },
    buildColumn(
      operationId: string,
      suggestedOrder: DimensionPriority | undefined,
      layer: DimensionLayer,
      field?: IndexPatternField
    ): T {
      if (!field) {
        throw new Error(`Invariant: A ${type} operation can only be built with a field`);
      }
      return {
        operationId,
        label: ofName(field ? field.name : ''),
        dataType: 'number',
        operationType: type,
        suggestedOrder,
        sourceField: field ? field.name : '',
        isBucketed: false,
        layer,
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
