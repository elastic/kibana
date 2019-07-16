/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiText } from '@elastic/eui';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';
import { PivotPreview } from './pivot_preview';

import { getPivotQuery, isKibanaContext, KibanaContext } from '../../../../common';
import { StepDefineExposedState } from './step_define_form';

const defaultSearch = '*';
const emptySearch = '';

export const StepDefineSummary: SFC<StepDefineExposedState> = ({
  search,
  groupByList,
  aggList,
}) => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const pivotQuery = getPivotQuery(search);

  const displaySearch = search === defaultSearch ? emptySearch : search;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          {kibanaContext.currentSavedSearch.id === undefined && typeof search === 'string' && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.indexPatternLabel', {
                  defaultMessage: 'Index pattern',
                })}
              >
                <span>{kibanaContext.currentIndexPattern.title}</span>
              </EuiFormRow>
              {displaySearch !== emptySearch && (
                <EuiFormRow
                  label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.queryLabel', {
                    defaultMessage: 'Query',
                  })}
                >
                  <span>{displaySearch}</span>
                </EuiFormRow>
              )}
            </Fragment>
          )}

          {kibanaContext.currentSavedSearch.id !== undefined && (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.savedSearchLabel', {
                defaultMessage: 'Saved search',
              })}
            >
              <span>{kibanaContext.currentSavedSearch.title}</span>
            </EuiFormRow>
          )}

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.groupByLabel', {
              defaultMessage: 'Group by',
            })}
          >
            <GroupByListSummary list={groupByList} />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.aggregationsLabel', {
              defaultMessage: 'Aggregations',
            })}
          >
            <AggListSummary list={aggList} />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
