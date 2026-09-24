/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { buildEsQuery } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldStatsResponse } from '@kbn/unified-field-list/src/types';
import { loadFieldStats } from '@kbn/unified-field-list/src/services/field_stats';
import type {
  FiltersIndexPatternColumn,
  FormBasedLayer,
  GenericIndexPatternColumn,
  IndexPattern,
  IndexPatternField,
  LastValueIndexPatternColumn,
  LastValueOrderAggColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  TermsIndexPatternColumn,
  FramePublicAPI,
} from '@kbn/lens-common';
import { isColumnOfType } from '@kbn/lens-common';
import { operationDefinitionMap } from '..';
import { filtersDefaultLabel } from '../filters/filters';
import { getDefaultDateFieldName } from '../helpers';
import { isReferenced } from '../../layer_helpers';

import type { FieldBasedOperationErrorMessage } from '..';

import { MULTI_KEY_VISUAL_SEPARATOR, supportedTypes, MAX_TERMS_OTHER_ENABLED } from './constants';
import {
  TERMS_CUSTOM_RANK_LAST_VALUE_NO_DATE_FIELD,
  TERMS_CUSTOM_RANK_LAST_VALUE_SORT_FIELD_INVALID_TYPE,
  TERMS_CUSTOM_RANK_LAST_VALUE_SORT_FIELD_NOT_FOUND,
  TERMS_MULTI_TERMS_AND_SCRIPTED_FIELDS,
  TERMS_WITH_MULTIPLE_TIMESHIFT,
} from '../../../../../user_messages_ids';

const fullSeparatorString = ` ${MULTI_KEY_VISUAL_SEPARATOR} `;

export function getMultiTermsScriptedFieldErrorMessage(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern
): FieldBasedOperationErrorMessage[] {
  const currentColumn = layer.columns[columnId] as TermsIndexPatternColumn;
  const usedFields = [currentColumn.sourceField, ...(currentColumn.params.secondaryFields ?? [])];

  const scriptedFields = usedFields.filter((field) => indexPattern.getFieldByName(field)?.scripted);
  if (usedFields.length < 2 || !scriptedFields.length) {
    return [];
  }

  return [
    {
      uniqueId: TERMS_MULTI_TERMS_AND_SCRIPTED_FIELDS,
      message: i18n.translate('xpack.lens.indexPattern.termsWithMultipleTermsAndScriptedFields', {
        defaultMessage:
          'Scripted fields are not supported when using multiple fields, found {fields}',
        values: {
          fields: scriptedFields.join(', '),
        },
      }),
    },
  ];
}

function getQueryForMultiTerms(fieldNames: string[], term: string) {
  const terms = term.split(fullSeparatorString);
  return fieldNames
    .map((fieldName, i) => `${fieldName}: ${terms[i] !== '*' ? `"${terms[i]}"` : terms[i]}`)
    .join(' AND ');
}

function getQueryLabel(fieldNames: string[], term: string) {
  if (fieldNames.length === 1) {
    return term;
  }
  return term
    .split(fullSeparatorString)
    .map((t: string, index: number) => {
      if (t == null) {
        return i18n.translate('xpack.lens.indexPattern.filterBy.emptyFilterQuery', {
          defaultMessage: '(empty)',
        });
      }
      return `${fieldNames[index]}: ${t}`;
    })
    .join(fullSeparatorString);
}

interface MultiFieldKeyFormat {
  keys: string[];
}

function isMultiFieldValue(term: unknown): term is MultiFieldKeyFormat {
  return (
    typeof term === 'object' &&
    term != null &&
    'keys' in term &&
    Array.isArray((term as MultiFieldKeyFormat).keys)
  );
}

export function getDisallowedTermsMessage(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern
): FieldBasedOperationErrorMessage[] {
  const referenced: Set<string> = new Set();
  Object.entries(layer.columns).forEach(([cId, c]) => {
    if ('references' in c) {
      c.references.forEach((r) => {
        referenced.add(r);
      });
    }
  });
  const hasMultipleShifts =
    uniq(
      Object.entries(layer.columns)
        .filter(
          ([colId, col]) =>
            operationDefinitionMap[col.operationType].shiftable &&
            (!isReferenced(layer, colId) || col.timeShift)
        )
        .map(([colId, col]) => col.timeShift || '')
    ).length > 1;
  if (!hasMultipleShifts) {
    return [];
  }
  return [
    {
      uniqueId: TERMS_WITH_MULTIPLE_TIMESHIFT,
      message: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShifts', {
        defaultMessage:
          'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
      }),
      fixAction: {
        label: i18n.translate('xpack.lens.indexPattern.termsWithMultipleShiftsFixActionLabel', {
          defaultMessage: 'Use filters',
        }),
        newState: async (
          data: DataPublicPluginStart,
          core: CoreStart,
          frame: FramePublicAPI,
          layerId: string
        ) => {
          const currentColumn = layer.columns[columnId] as TermsIndexPatternColumn;
          const fieldNames = [
            currentColumn.sourceField,
            ...(currentColumn.params?.secondaryFields ?? []),
          ];
          const table = frame.activeData?.[layerId] || frame.activeData?.default;
          const activeDataFieldNameMatch =
            table?.columns.find(({ id }) => id === columnId)?.meta.field === fieldNames[0];

          let currentTerms = uniq(
            table?.rows
              .map((row) => row[columnId] as string | MultiFieldKeyFormat)
              .filter((term) =>
                fieldNames.length > 1
                  ? isMultiFieldValue(term) && term.keys[0] !== '__other__'
                  : typeof term === 'string' && term !== '__other__'
              )
              .map((term: string | MultiFieldKeyFormat) =>
                isMultiFieldValue(term) ? term.keys.join(fullSeparatorString) : term
              ) || []
          );
          if (!activeDataFieldNameMatch || currentTerms.length === 0) {
            if (fieldNames.length === 1) {
              const currentDataView = await data.dataViews.get(indexPattern.id);
              const response: FieldStatsResponse<string | number> = await loadFieldStats({
                services: { data },
                dataView: currentDataView,
                field: indexPattern.getFieldByName(fieldNames[0])! as DataViewField,
                dslQuery: buildEsQuery(
                  indexPattern,
                  frame.query,
                  frame.filters,
                  getEsQueryConfig(core.uiSettings)
                ),
                fromDate: frame.dateRange.fromDate,
                toDate: frame.dateRange.toDate,
                size: currentColumn.params.size,
              });
              currentTerms = response.topValues?.buckets.map(({ key }) => String(key)) || [];
            }
          }
          // when multi terms the meta.field will always be undefined, so limit the check to no data
          if (fieldNames.length > 1 && currentTerms.length === 0) {
            // this will produce a query like `field1: * AND field2: * ...etc`
            // which is the best we can do for multiple terms when no data is available
            currentTerms = [Array(fieldNames.length).fill('*').join(fullSeparatorString)];
          }

          return {
            ...layer,
            columns: {
              ...layer.columns,
              [columnId]: {
                label: i18n.translate('xpack.lens.indexPattern.pinnedTopValuesLabel', {
                  defaultMessage: 'Filters of {field}',
                  values: {
                    field:
                      fieldNames.length > 1 ? fieldNames.join(fullSeparatorString) : fieldNames[0],
                  },
                }),
                customLabel: true,
                isBucketed: layer.columns[columnId].isBucketed,
                dataType: 'string',
                operationType: 'filters',
                params: {
                  filters:
                    currentTerms.length > 0
                      ? currentTerms.map((term) => ({
                          input: {
                            query:
                              fieldNames.length === 1
                                ? `${fieldNames[0]}: "${term}"`
                                : getQueryForMultiTerms(fieldNames, term),
                            language: 'kuery',
                          },
                          label: getQueryLabel(fieldNames, term),
                        }))
                      : [
                          {
                            input: {
                              query: '*',
                              language: 'kuery',
                            },
                            label: filtersDefaultLabel,
                          },
                        ],
                },
              } as FiltersIndexPatternColumn,
            },
          };
        },
      },
    },
  ];
}

/**
 * A terms column ordered by a custom `last_value` order-agg, narrowed so that `params.orderAgg` is a
 * `LastValueOrderAggColumn`.
 */
export type TermsColumnWithLastValueOrderAgg = TermsIndexPatternColumn & {
  params: TermsIndexPatternColumn['params'] & { orderAgg: LastValueOrderAggColumn };
};

/**
 * Type guard for a terms column ordered by a custom `last_value` order-agg. Shared by the sortField
 * status resolver, its consumers, and render-time auto-fill so they all narrow the column the same
 * way.
 */
export function isCustomLastValueOrderAgg(
  column: GenericIndexPatternColumn | undefined
): column is TermsColumnWithLastValueOrderAgg {
  if (!column || !isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
    return false;
  }

  const { orderBy, orderAgg } = column.params;
  return (
    orderBy.type === 'custom' &&
    !!orderAgg &&
    isColumnOfType<LastValueOrderAggColumn>('last_value', orderAgg)
  );
}

/**
 * Status of the `sortField` on a terms column whose custom `rank_by` is a `last_value` order-agg.
 * `missing-with-default` carries the date field the render/editor should fall back to.
 */
export type OrderAggLastValueSortFieldStatus =
  | { status: 'ok' }
  | { status: 'missing-with-default'; defaultField: string }
  | { status: 'missing-no-default' }
  | { status: 'not-found' }
  | { status: 'wrong-type' };

/**
 * Resolves the sortField status of a terms column ordered by a custom last_value order-agg so that
 * render auto-fill, editor warnings, and blocking errors all reason about the same field.
 */
export function getOrderAggLastValueSortFieldStatus(
  column: TermsColumnWithLastValueOrderAgg,
  indexPattern: IndexPattern
): OrderAggLastValueSortFieldStatus {
  const sortField = column.params.orderAgg.params?.sortField;

  if (!sortField) {
    const defaultField = getDefaultDateFieldName(indexPattern);
    return defaultField
      ? { status: 'missing-with-default', defaultField }
      : { status: 'missing-no-default' };
  }

  const field = indexPattern.getFieldByName(sortField);
  if (!field) {
    return { status: 'not-found' };
  }
  if (field.type !== 'date') {
    return { status: 'wrong-type' };
  }
  return { status: 'ok' };
}

/**
 * Blocking errors for a terms column ordered by a custom last_value order-agg whose `sortField`
 * cannot be resolved to a date. The `missing-with-default` case is handled by a non-blocking
 * warning + render auto-fill, so it produces no error here.
 */
export function getOrderAggErrorMessages(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern
): FieldBasedOperationErrorMessage[] {
  const column = layer.columns[columnId];
  if (!isCustomLastValueOrderAgg(column)) {
    return [];
  }

  const status = getOrderAggLastValueSortFieldStatus(column, indexPattern);
  const sortField = column.params.orderAgg.params?.sortField ?? '';

  switch (status.status) {
    case 'missing-no-default':
      return [
        {
          uniqueId: TERMS_CUSTOM_RANK_LAST_VALUE_NO_DATE_FIELD,
          message: i18n.translate('xpack.lens.indexPattern.terms.customRankLastValueNoDateField', {
            defaultMessage:
              'To rank top values by their last value, the data view must have a date field, but this one has none',
          }),
        },
      ];
    case 'not-found':
      return [
        {
          uniqueId: TERMS_CUSTOM_RANK_LAST_VALUE_SORT_FIELD_NOT_FOUND,
          message: i18n.translate(
            'xpack.lens.indexPattern.terms.customRankLastValueSortFieldNotFound',
            {
              defaultMessage: 'Sort field {sortField} was not found',
              values: { sortField },
            }
          ),
        },
      ];
    case 'wrong-type':
      return [
        {
          uniqueId: TERMS_CUSTOM_RANK_LAST_VALUE_SORT_FIELD_INVALID_TYPE,
          message: i18n.translate(
            'xpack.lens.indexPattern.terms.customRankLastValueSortFieldInvalidType',
            {
              defaultMessage:
                'Field {invalidField} is not a date field and cannot be used for sorting',
              values: { invalidField: sortField },
            }
          ),
        },
      ];
    default:
      return [];
  }
}

function checkLastValue(column: GenericIndexPatternColumn) {
  return (
    column.operationType !== 'last_value' ||
    (['number', 'date'].includes(column.dataType) &&
      !(column as LastValueIndexPatternColumn).params.showArrayValues)
  );
}

// allow the rank by metric only if the percentile rank value is integer
// https://github.com/elastic/elasticsearch/issues/66677

export function isPercentileSortable(column: GenericIndexPatternColumn) {
  const isPercentileColumn = isColumnOfType<PercentileIndexPatternColumn>('percentile', column);
  return !isPercentileColumn || (isPercentileColumn && Number.isInteger(column.params.percentile));
}

export function isPercentileRankSortable(column: GenericIndexPatternColumn) {
  const isPercentileRankColumn = isColumnOfType<PercentileRanksIndexPatternColumn>(
    'percentile_rank',
    column
  );
  return (
    !isPercentileRankColumn || (isPercentileRankColumn && Number.isInteger(column.params.value))
  );
}

export function isSortableByColumn(layer: FormBasedLayer, columnId: string) {
  const column = layer.columns[columnId];
  return (
    column &&
    !column.isBucketed &&
    checkLastValue(column) &&
    isPercentileRankSortable(column) &&
    isPercentileSortable(column) &&
    !('references' in column) &&
    !isReferenced(layer, columnId)
  );
}

export function isScriptedField(field: IndexPatternField): boolean;
export function isScriptedField(fieldName: string, indexPattern: IndexPattern): boolean;
export function isScriptedField(
  fieldName: string | IndexPatternField,
  indexPattern?: IndexPattern
) {
  if (typeof fieldName === 'string') {
    const field = indexPattern?.getFieldByName(fieldName);
    return field && field.scripted;
  }
  return fieldName.scripted;
}

export function isRuntimeField(field: IndexPatternField): boolean {
  return Boolean(field.runtime);
}

export function getFieldsByValidationState(
  newIndexPattern: IndexPattern,
  column?: GenericIndexPatternColumn,
  field?: string | IndexPatternField
): {
  allFields: Array<IndexPatternField | undefined>;
  validFields: string[];
  invalidFields: string[];
} {
  const newFieldNames: string[] = [];
  if (column && 'sourceField' in column) {
    if (column.sourceField) {
      newFieldNames.push(column.sourceField);
    }
    if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
      newFieldNames.push(...(column.params?.secondaryFields ?? []));
    }
  }
  if (field) {
    newFieldNames.push(typeof field === 'string' ? field : field.name || field.displayName);
  }
  const newFields = newFieldNames.map((fieldName) => newIndexPattern.getFieldByName(fieldName));
  // lodash groupby does not provide the index arg, so had to write it manually :(
  const validFields: string[] = [];
  const invalidFields: string[] = [];
  // mind to check whether a column was passed, in such case single term with scripted field is ok
  const canAcceptScripted = Boolean(column && newFields.length === 1);
  newFieldNames.forEach((fieldName, i) => {
    const newField = newFields[i];
    const isValid =
      newField &&
      supportedTypes.has(newField.type) &&
      newField.aggregatable &&
      newField.timeSeriesMetric !== 'counter' &&
      (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms) &&
      (canAcceptScripted || !isScriptedField(newField));

    const arrayToPush = isValid ? validFields : invalidFields;
    arrayToPush.push(fieldName);
  });

  return {
    allFields: newFields,
    validFields,
    invalidFields,
  };
}

export function getOtherBucketSwitchDefault(column: TermsIndexPatternColumn, size: number) {
  const otherBucketValue = column.params.otherBucket;
  return (otherBucketValue || otherBucketValue === undefined) && size < MAX_TERMS_OTHER_ENABLED;
}
