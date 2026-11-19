/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import type {
  BaseIndexPatternColumn,
  ColumnBuildHints,
  FieldBasedIndexPatternColumn,
  FormBasedLayer,
} from '@kbn/lens-common';
import { DOCUMENT_FIELD_NAME } from '../../../../../../common/constants';
import type { GenericOperationDefinition } from '..';
import { unquotedStringRegex } from './util';
import { hasOperationType } from '../helpers';

// Just handle two levels for now
type OperationParams = Record<string, string | number | Record<string, string | number>>;

export function getSafeFieldName({
  sourceField: fieldName,
  operationType,
}: FieldBasedIndexPatternColumn) {
  // return empty for the records field
  if (!fieldName || (operationType === 'count' && fieldName === DOCUMENT_FIELD_NAME)) {
    return '';
  }
  if (unquotedStringRegex.test(fieldName)) {
    return `'${fieldName.replaceAll(`'`, "\\'")}'`;
  }
  return fieldName;
}

/**
 * Generates a formula string from a previous column's configuration.
 * Used when transitioning from another operation type to a formula operation.
 */
export function generateFormula(
  previousColumn: ColumnBuildHints,
  layer: FormBasedLayer,
  previousFormula: string,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (
    hasOperationType(previousColumn, 'static_value') &&
    previousColumn.params &&
    'value' in previousColumn.params
  ) {
    return String(previousColumn.params.value);
  }
  if (previousColumn.references && previousColumn.references.length > 0) {
    const metric = layer.columns[previousColumn.references[0]];
    if (metric && 'sourceField' in metric && metric.dataType === 'number') {
      const fieldName = getSafeFieldName(metric);
      // TODO need to check the input type from the definition
      previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName})`;
    }
  } else if (
    previousColumn.sourceField &&
    (previousColumn.dataType === 'number' || previousColumn.dataType === 'date')
  ) {
    previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
      previousColumn as FieldBasedIndexPatternColumn
    )}`;
  } else {
    // couldn't find formula function to call, exit early because adding args is going to fail anyway
    return '';
  }
  const formulaNamedArgs =
    'isBucketed' in previousColumn
      ? extractParamsForFormula(previousColumn, operationDefinitionMap)
      : [];
  if (formulaNamedArgs.length) {
    previousFormula +=
      ', ' + formulaNamedArgs.map(({ name, value }) => `${name}=${value}`).join(', ');
  }
  if (previousColumn.filter) {
    if (
      previousColumn.operationType !== 'count' ||
      ('sourceField' in previousColumn && previousColumn.sourceField !== DOCUMENT_FIELD_NAME)
    ) {
      previousFormula += ', ';
    }
    previousFormula +=
      (previousColumn.filter.language === 'kuery' ? 'kql=' : 'lucene=') +
      `'${previousColumn.filter.query.replace(/\\/g, '\\\\').replace(/'/g, `\\'`)}'`; // replace all
  }
  if (previousColumn.timeShift) {
    if (
      previousColumn.operationType !== 'count' ||
      ('sourceField' in previousColumn && previousColumn.sourceField !== DOCUMENT_FIELD_NAME) ||
      previousColumn.filter
    ) {
      previousFormula += ', ';
    }
    previousFormula += `shift='${previousColumn.timeShift}'`;
  }
  if (previousColumn.reducedTimeRange) {
    if (
      previousColumn.operationType !== 'count' ||
      previousColumn.filter ||
      previousColumn.timeShift
    ) {
      previousFormula += ', ';
    }
    previousFormula += `reducedTimeRange='${previousColumn.reducedTimeRange}'`;
  }
  if (previousFormula) {
    // close the formula at the end
    previousFormula += ')';
  }
  return previousFormula;
}

interface ParameterizedColumn extends BaseIndexPatternColumn {
  params: OperationParams;
}

function isParameterizedColumn(col: ColumnBuildHints): col is ParameterizedColumn {
  return Boolean('params' in col && col.params);
}

function extractParamsForFormula(
  column: ColumnBuildHints,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (
    !operationDefinitionMap ||
    !column.operationType ||
    !operationDefinitionMap[column.operationType]
  ) {
    return [];
  }
  const def = operationDefinitionMap[column.operationType];
  if ('operationParams' in def && isParameterizedColumn(column)) {
    return (def.operationParams || []).flatMap(({ name, required }) => {
      const value = column.params[name];
      if (isObject(value)) {
        return Object.keys(value).map((subName) => ({
          name: `${name}-${subName}`,
          value: value[subName] as string | number,
          required,
        }));
      }
      return {
        name,
        value,
        required,
      };
    });
  }
  return [];
}
