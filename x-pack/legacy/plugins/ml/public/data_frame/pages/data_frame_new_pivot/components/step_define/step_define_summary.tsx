/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiText } from '@elastic/eui';

import { useAngularContext } from '../../../../../contexts/angular';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';
import { PivotPreview } from './pivot_preview';

import { getPivotQuery } from '../../../../common';
import { StepDefineExposedState } from './step_define_form';

const defaultSearch = '*';
const emptySearch = '';

export const StepDefineSummary: SFC<StepDefineExposedState> = ({
  searchString,
  searchQuery,
  groupByList,
  aggList,
}) => {
  const angularContext = useAngularContext();

  const pivotQuery = getPivotQuery(searchQuery);

  const displaySearch = searchString === defaultSearch ? emptySearch : searchString;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          {angularContext.currentSavedSearch.id === undefined && typeof searchString === 'string' && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.indexPatternLabel', {
                  defaultMessage: 'Index pattern',
                })}
              >
                <span>{angularContext.currentIndexPattern.title}</span>
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

          {angularContext.currentSavedSearch.id !== undefined && (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.stepDefineSummary.savedSearchLabel', {
                defaultMessage: 'Saved search',
              })}
            >
              <span>{angularContext.currentSavedSearch.title}</span>
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
