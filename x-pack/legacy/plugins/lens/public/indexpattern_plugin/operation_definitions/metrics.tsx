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

function buildMetricOperation<T extends FieldBasedIndexPatternColumn>({
  type,
  displayName,
  ofName,
  priority,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name: string) => string;
  priority?: number;
}) {
  const operationDefinition: OperationDefinition<T> = {
    priority,
    type,
    displayName,
    getPossibleOperationsForDocument: () => [],
    getPossibleOperationsForField: ({ aggregationRestrictions, aggregatable, type: fieldType }) => {
      if (
        fieldType === 'number' &&
        aggregatable &&
        (!aggregationRestrictions || aggregationRestrictions[type])
      ) {
        return [
          {
            dataType: 'number',
            isBucketed: false,
            scale: 'ratio',
          },
        ];
      }
      return [];
    },
    isTransferable: (column, newIndexPattern) => {
      const newField = newIndexPattern.fields.find(field => field.name === column.sourceField);

      return Boolean(
        newField &&
          newField.type === 'number' &&
          newField.aggregatable &&
          (!newField.aggregationRestrictions || newField.aggregationRestrictions![type])
      );
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
        scale: 'ratio',
      } as T;
    },
    onFieldChange: (oldColumn, indexPattern, field) => {
      return {
        ...oldColumn,
        label: ofName(field.name),
        sourceField: field.name,
      };
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

export const minOperation = buildMetricOperation<MinIndexPatternColumn>({
  type: 'min',
  displayName: i18n.translate('xpack.lens.indexPattern.min', {
    defaultMessage: 'Minimum',
  }),
  ofName: name =>
    i18n.translate('xpack.lens.indexPattern.minOf', {
      defaultMessage: 'Minimum of {name}',
      values: { name },
    }),
});

export const maxOperation = buildMetricOperation<MaxIndexPatternColumn>({
  type: 'max',
  displayName: i18n.translate('xpack.lens.indexPattern.max', {
    defaultMessage: 'Maximum',
  }),
  ofName: name =>
    i18n.translate('xpack.lens.indexPattern.maxOf', {
      defaultMessage: 'Maximum of {name}',
      values: { name },
    }),
});

export const averageOperation = buildMetricOperation<AvgIndexPatternColumn>({
  type: 'avg',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.avg', {
    defaultMessage: 'Average',
  }),
  ofName: name =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    }),
});

export const sumOperation = buildMetricOperation<SumIndexPatternColumn>({
  type: 'sum',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.sum', {
    defaultMessage: 'Sum',
  }),
  ofName: name =>
    i18n.translate('xpack.lens.indexPattern.sumOf', {
      defaultMessage: 'Sum of {name}',
      values: { name },
    }),
});
