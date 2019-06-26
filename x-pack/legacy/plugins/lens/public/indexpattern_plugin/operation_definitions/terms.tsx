/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiRange, EuiSelect } from '@elastic/eui';
import { IndexPatternField, TermsIndexPatternColumn } from '../indexpattern';
import { DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';
import { updateColumnParam } from '../state_helpers';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top Values of {name}',
    values: { name },
  });
}

export const termsOperation: OperationDefinition<TermsIndexPatternColumn> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top Values',
  }),
  isApplicableWithoutField: false,
  isApplicableForField: ({ aggregationRestrictions, type }) => {
    return Boolean(
      type === 'string' && (!aggregationRestrictions || aggregationRestrictions.terms)
    );
  },
  buildColumn(
    operationId: string,
    suggestedOrder?: DimensionPriority,
    field?: IndexPatternField
  ): TermsIndexPatternColumn {
    return {
      operationId,
      label: ofName(field ? field.name : ''),
      dataType: 'string',
      operationType: 'terms',
      suggestedOrder,
      sourceField: field ? field.name : '',
      isBucketed: true,
      params: {
        size: 5,
        orderBy: { type: 'alphabetical' },
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'terms',
    schema: 'segment',
    params: {
      field: column.sourceField,
      orderBy:
        column.params.orderBy.type === 'alphabetical' ? '_key' : column.params.orderBy.columnId,
      order: 'desc',
      size: column.params.size,
      otherBucket: false,
      otherBucketLabel: 'Other',
      missingBucket: false,
      missingBucketLabel: 'Missing',
    },
  }),
  paramEditor: ({ state, setState, columnId: currentColumnId }) => {
    const currentColumn = state.columns[currentColumnId] as TermsIndexPatternColumn;
    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical' };
      }
      const parts = value.split(SEPARATOR);
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    const orderOptions = Object.entries(state.columns)
      .filter(([_columnId, column]) => !column.isBucketed)
      .map(([columnId, column]) => {
        return {
          value: toValue({ type: 'column', columnId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.terms.orderAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.size', {
            defaultMessage: 'Number of values',
          })}
        >
          <FixedEuiRange
            min={1}
            max={20}
            step={1}
            value={currentColumn.params.size}
            showInput
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setState(updateColumnParam(state, currentColumn, 'size', Number(e.target.value)))
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.size', {
              defaultMessage: 'Number of values',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
            defaultMessage: 'Order by',
          })}
        >
          <EuiSelect
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setState(
                updateColumnParam(state, currentColumn, 'orderBy', fromValue(e.target.value))
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
};
