/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEqual } from 'lodash';
import type { Query } from '@kbn/es-query';
import type {
  ColumnBuildHints,
  FieldBasedIndexPatternColumn,
  FormattedIndexPatternColumn,
  GenericIndexPatternColumn,
  TextBasedLayerColumn,
  FormBasedLayer,
  FormBasedPersistedState,
  IndexPattern,
  IndexPatternField,
} from '@kbn/lens-common';
import { cleanupFormulaReferenceColumns, hasStateFormulaColumn } from '@kbn/lens-common';
import { type FieldBasedOperationErrorMessage, operationDefinitionMap } from '.';
import { hasField } from '../../pure_utils';
import { FIELD_NOT_FOUND, FIELD_WRONG_TYPE } from '../../../../user_messages_ids';

export function getInvalidFieldMessage(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern?: IndexPattern
): FieldBasedOperationErrorMessage[] {
  if (!indexPattern) {
    return [];
  }

  const column = layer.columns[columnId] as FieldBasedIndexPatternColumn;
  const { operationType } = column;
  const operationDefinition = operationType ? operationDefinitionMap[operationType] : undefined;
  const fieldNames =
    hasField(column) && operationDefinition
      ? operationDefinition?.getCurrentFields?.(column) ?? [column.sourceField]
      : [];
  const fields = fieldNames.map((fieldName) => indexPattern.getFieldByName(fieldName));
  const filteredFields = fields.filter(Boolean) as IndexPatternField[];

  const isInvalid = Boolean(
    fields.length > filteredFields.length ||
      !(
        operationDefinition?.input === 'field' &&
        filteredFields.every(
          (field) => operationDefinition.getPossibleOperationForField(field) != null
        )
      )
  );

  const isWrongType = Boolean(
    filteredFields.length &&
      !operationDefinition?.isTransferable(
        column as GenericIndexPatternColumn,
        indexPattern,
        operationDefinitionMap
      )
  );

  if (isInvalid) {
    // Missing fields have priority over wrong type
    // This has been moved as some transferable checks also perform exist checks internally and fail eventually
    // but that would make type mismatch error appear in place of missing fields scenarios
    const missingFields = fields
      .map((field, i) => (field ? null : fieldNames[i]))
      .filter(Boolean) as string[];
    if (missingFields.length) {
      return [generateMissingFieldMessage(missingFields, columnId)];
    }
    if (isWrongType) {
      // as fallback show all the fields as invalid?
      const wrongTypeFields =
        operationDefinition?.getNonTransferableFields?.(column, indexPattern) ?? fieldNames;
      return [
        {
          uniqueId: FIELD_WRONG_TYPE,
          message: i18n.translate('xpack.lens.indexPattern.fieldsWrongType', {
            defaultMessage:
              '{count, plural, one {Field} other {Fields}} {invalidFields} {count, plural, one {is} other {are}} of the wrong type',
            values: {
              count: wrongTypeFields.length,
              invalidFields: wrongTypeFields.join(', '),
            },
          }),
        },
      ];
    }
  }

  return [];
}

export const generateMissingFieldMessage = (
  missingFields: string[],
  columnId: string
): FieldBasedOperationErrorMessage => ({
  uniqueId: FIELD_NOT_FOUND,
  message: (
    <FormattedMessage
      id="xpack.lens.indexPattern.fieldsNotFound"
      defaultMessage="{count, plural, one {Field} other {Fields}} {missingFields} {count, plural, one {was} other {were}} not found."
      values={{
        count: missingFields.length,
        missingFields: (
          <>
            {missingFields.map((field, index) => (
              <Fragment key={field}>
                <strong>{field}</strong>
                {index + 1 === missingFields.length ? '' : ', '}
              </Fragment>
            ))}
          </>
        ),
      }}
    />
  ),
  displayLocations: [
    { id: 'toolbar' },
    { id: 'dimensionButton', dimensionId: columnId },
    { id: 'embeddableBadge' },
  ],
});

export function getSafeName(name: string, indexPattern: IndexPattern | undefined): string {
  const field = indexPattern?.getFieldByName(name);
  return field
    ? field.displayName
    : i18n.translate('xpack.lens.indexPattern.missingFieldLabel', {
        defaultMessage: 'Missing field',
      });
}

function areDecimalsValid(inputValue: string | number, digits: number) {
  const [, decimals = ''] = `${inputValue}`.split('.');
  return decimals.length <= digits;
}

export function isValidNumber(
  inputValue: string | number | null | undefined,
  integer?: boolean,
  upperBound?: number,
  lowerBound?: number,
  digits: number = 2
) {
  const inputValueAsNumber = Number(inputValue);
  return (
    inputValue !== '' &&
    inputValue != null &&
    !Number.isNaN(inputValueAsNumber) &&
    Number.isFinite(inputValueAsNumber) &&
    (!integer || Number.isInteger(inputValueAsNumber)) &&
    (upperBound === undefined || inputValueAsNumber <= upperBound) &&
    (lowerBound === undefined || inputValueAsNumber >= lowerBound) &&
    areDecimalsValid(inputValue, integer ? 0 : digits)
  );
}

/**
 * Type guard for narrowing a full column to a specific column type.
 * Use this when you have a complete `GenericIndexPatternColumn` and need to
 * access type-specific properties with full type safety.
 */
export function isColumnOfType<C extends GenericIndexPatternColumn>(
  type: C['operationType'],
  column: GenericIndexPatternColumn
): column is C {
  return column.operationType === type;
}

/**
 * Checks if partial column hints match a specific operation type.
 * Use this in `buildColumn` implementations when working with `previousColumn`
 * which is typed as `ColumnBuildHints` (partial metadata, not a full column).
 *
 * Unlike `isColumnOfType`, this does NOT narrow the type - it only returns a boolean.
 * Use `getBooleanParam` or `getNumberParam` to safely extract typed params.
 */
export function hasOperationType(column: ColumnBuildHints | undefined, type: string): boolean {
  return column?.operationType === type;
}

/**
 * Safely extracts a boolean param from column hints.
 * Returns `undefined` if the param doesn't exist or isn't a boolean.
 */
export function getBooleanParam(
  column: ColumnBuildHints | undefined,
  paramName: string
): boolean | undefined {
  const value = column?.params?.[paramName];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Safely extracts a number param from column hints.
 * Returns `undefined` if the param doesn't exist or isn't a number.
 */
export function getNumberParam(
  column: ColumnBuildHints | undefined,
  paramName: string
): number | undefined {
  const value = column?.params?.[paramName];
  return typeof value === 'number' ? value : undefined;
}

export const isColumn = (
  setter:
    | GenericIndexPatternColumn
    | FormBasedLayer
    | ((prevLayer: FormBasedLayer) => FormBasedLayer)
): setter is GenericIndexPatternColumn => {
  return 'operationType' in setter;
};

export function isColumnFormatted(
  column: GenericIndexPatternColumn | TextBasedLayerColumn
): column is FormattedIndexPatternColumn | TextBasedLayerColumn {
  return Boolean(
    'params' in column &&
      (column as FormattedIndexPatternColumn).params &&
      'format' in (column as FormattedIndexPatternColumn).params!
  );
}

export function getFormatFromPreviousColumn(previousColumn: ColumnBuildHints | undefined) {
  return previousColumn?.dataType === 'number' && previousColumn.params?.format
    ? { format: previousColumn.params.format }
    : undefined;
}

// Check the escape argument when used for transitioning comparisons
export function getExistsFilter(field: string, escape: boolean = true) {
  return {
    query: escape ? `"${field}": *` : `${field}: *`,
    language: 'kuery',
  };
}

// Useful utility to compare for escape and unescaped exist filters
export function comparePreviousColumnFilter(filter: Query | undefined, field: string) {
  return isEqual(filter, getExistsFilter(field)) || isEqual(filter, getExistsFilter(field, false));
}

export function getFilter(
  previousColumn: ColumnBuildHints | undefined,
  columnParams: { kql?: string | undefined; lucene?: string | undefined } | undefined
) {
  let filter = previousColumn?.filter;
  if (
    previousColumn &&
    previousColumn.operationType === 'last_value' &&
    previousColumn.sourceField &&
    comparePreviousColumnFilter(filter, previousColumn.sourceField)
  ) {
    return;
  }
  if (columnParams) {
    if ('kql' in columnParams) {
      filter = { query: columnParams.kql ?? '', language: 'kuery' };
    } else if ('lucene' in columnParams) {
      filter = { query: columnParams.lucene ?? '', language: 'lucene' };
    }
  }
  return filter;
}

export function isMetricCounterField(field?: IndexPatternField) {
  return field?.timeSeriesMetric === 'counter';
}

export function cleanupFormulaColumns(state: FormBasedPersistedState): FormBasedPersistedState {
  // check whether it makes sense to perform all the work for formula
  if (hasStateFormulaColumn(state)) {
    return state;
  }

  const layers = { ...state.layers };
  for (const layerId of Object.keys(layers)) {
    layers[layerId] = cleanupFormulaReferenceColumns(layers[layerId]);
  }

  return {
    ...state,
    layers,
  };
}
