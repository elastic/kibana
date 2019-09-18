/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFormRow } from '@elastic/eui';
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
        numerator: { language: 'kuery', query: '' },
        denominator: { language: 'kuery', query: '' },
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
  paramEditor: ({
    state,
    setState,
    currentColumn,
    uiSettings,
    storage,
    layerId,
    savedObjectsClient,
    http,
  }) => {
    const [hasDenominator, setDenominator] = useState(false);

    return (
      <div>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filterRatioNumeratorLabel', {
            defaultMessage: 'Count of documents matching query:',
          })}
        >
          <QueryBarInput
            appName={'lens'}
            indexPatterns={[state.indexPatterns[state.layers[layerId].indexPatternId].title]}
            query={currentColumn.params.numerator}
            screenTitle={''}
            store={storage}
            uiSettings={uiSettings}
            savedObjectsClient={savedObjectsClient}
            http={http}
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
        >
          {hasDenominator ? (
            <QueryBarInput
              appName={'lens'}
              indexPatterns={[state.indexPatterns[state.layers[layerId].indexPatternId].title]}
              query={currentColumn.params.denominator}
              screenTitle={''}
              store={storage}
              uiSettings={uiSettings}
              savedObjectsClient={savedObjectsClient}
              http={http}
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
            <>
              <FormattedMessage
                id="xpack.lens.indexPattern.filterRatioDefaultDenominator"
                defaultMessage="Count of documents"
              />

              <EuiFormRow>
                <EuiButton
                  data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"
                  fill
                  onClick={() => setDenominator(true)}
                >
                  <FormattedMessage
                    id="xpack.lens.indexPattern.filterRatioUseDenominatorButton"
                    defaultMessage="Divide by filter instead"
                  />
                </EuiButton>
              </EuiFormRow>
            </>
          )}
        </EuiFormRow>
      </div>
    );
  },
};
