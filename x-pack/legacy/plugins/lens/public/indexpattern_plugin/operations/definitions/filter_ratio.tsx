/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldText, EuiLink, EuiText } from '@elastic/eui';
import { isEqual } from 'lodash';
import {
  Query,
  QueryBarInput,
} from '../../../../../../../../src/legacy/core_plugins/data/public/query';
import { updateColumnParam } from '../../state_helpers';
import { OperationDefinition } from '.';
import { BaseIndexPatternColumn } from './column_types';

const filterRatioLabel = i18n.translate('xpack.lens.indexPattern.filterRatio', {
  defaultMessage: 'Filter Ratio',
});

export interface FilterRatioIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: 'filter_ratio';
  params: {
    numerator: Query;
    denominator: Query;
  };
}

const initialQuery = { language: 'kuery', query: '' };

export const filterRatioOperation: OperationDefinition<FilterRatioIndexPatternColumn> = {
  type: 'filter_ratio',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.filterRatio', {
    defaultMessage: 'Filter Ratio',
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
      label: filterRatioLabel,
      dataType: 'number',
      operationType: 'filter_ratio',
      suggestedPriority,
      isBucketed: false,
      scale: 'ratio',
      params: {
        numerator: initialQuery,
        denominator: initialQuery,
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'filters',
    schema: 'segment',
    params: {
      filters: [
        {
          input: column.params.numerator,
          label: '',
        },
        {
          input: column.params.denominator,
          label: '',
        },
      ],
    },
  }),
  isTransferable: (column, newIndexPattern) => {
    // TODO parse the KQL tree and check whether this would work out
    return false;
  },
  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const [hasDenominator, setDenominator] = useState(
      !isEqual(currentColumn.params.denominator, initialQuery)
    );

    return (
      <div>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filterRatioNumeratorLabel', {
            defaultMessage: 'Count of documents matching query:',
          })}
        >
          <QueryBarInput
            indexPatterns={[state.indexPatterns[state.layers[layerId].indexPatternId].title]}
            query={currentColumn.params.numerator}
            onChange={(newQuery: Query) => {
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'numerator',
                  value: newQuery,
                })
              );
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filterRatioDividesLabel', {
            defaultMessage: 'Divided by:',
          })}
          data-test-subj="lns-indexPatternFilterRatio-dividedByRow"
          labelAppend={
            <EuiText size="xs">
              {hasDenominator ? (
                <EuiLink
                  data-test-subj="lns-indexPatternFilterRatio-hideDenominatorButton"
                  onClick={() => {
                    setDenominator(false);
                    setState(
                      updateColumnParam({
                        state,
                        layerId,
                        currentColumn,
                        paramName: 'denominator',
                        value: initialQuery,
                      })
                    );
                  }}
                >
                  <FormattedMessage
                    id="xpack.lens.indexPattern.filterRatioUseDocumentsButton"
                    defaultMessage="Use count of documents"
                  />
                </EuiLink>
              ) : (
                <EuiLink
                  data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"
                  onClick={() => setDenominator(true)}
                >
                  <FormattedMessage
                    id="xpack.lens.indexPattern.filterRatioUseDenominatorButton"
                    defaultMessage="Use filter"
                  />
                </EuiLink>
              )}
            </EuiText>
          }
        >
          {hasDenominator ? (
            <QueryBarInput
              indexPatterns={[state.indexPatterns[state.layers[layerId].indexPatternId].title]}
              query={currentColumn.params.denominator}
              onChange={(newQuery: Query) => {
                setState(
                  updateColumnParam({
                    state,
                    layerId,
                    currentColumn,
                    paramName: 'denominator',
                    value: newQuery,
                  })
                );
              }}
            />
          ) : (
            <EuiFieldText
              readOnly
              defaultValue={i18n.translate(
                'xpack.lens.indexPattern.filterRatioDefaultDenominator',
                {
                  defaultMessage: 'Count of documents',
                }
              )}
            />
          )}
        </EuiFormRow>
      </div>
    );
  },
};
