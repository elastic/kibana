/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import { useKibanaContext } from '../../../../lib/kibana';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';
import { PivotPreview } from './pivot_preview';

import { getPivotQuery } from '../../../../common';
import { StepDefineExposedState } from './step_define_form';

const defaultSearch = '*';
const emptySearch = '';

export const StepDefineSummary: FC<StepDefineExposedState> = ({
  searchString,
  searchQuery,
  groupByList,
  aggList,
}) => {
  const kibanaContext = useKibanaContext();

  const pivotQuery = getPivotQuery(searchQuery);
  let useCodeBlock = false;
  let displaySearch;
  // searchString set to empty once source config editor used - display query instead
  if (searchString === emptySearch) {
    displaySearch = JSON.stringify(searchQuery, null, 2);
    useCodeBlock = true;
  } else if (searchString === defaultSearch) {
    displaySearch = emptySearch;
  } else {
    displaySearch = searchString;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <div data-test-subj="transformStepDefineSummary">
          <EuiForm>
            {kibanaContext.currentSavedSearch !== undefined &&
              kibanaContext.currentSavedSearch.id === undefined &&
              typeof searchString === 'string' && (
                <Fragment>
                  <EuiFormRow
                    label={i18n.translate('xpack.transform.stepDefineSummary.indexPatternLabel', {
                      defaultMessage: 'Index pattern',
                    })}
                  >
                    <span>{kibanaContext.currentIndexPattern.title}</span>
                  </EuiFormRow>
                  {useCodeBlock === false && displaySearch !== emptySearch && (
                    <EuiFormRow
                      label={i18n.translate('xpack.transform.stepDefineSummary.queryLabel', {
                        defaultMessage: 'Query',
                      })}
                    >
                      <span>{displaySearch}</span>
                    </EuiFormRow>
                  )}
                  {useCodeBlock === true && displaySearch !== emptySearch && (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.transform.stepDefineSummary.queryCodeBlockLabel',
                        {
                          defaultMessage: 'Query',
                        }
                      )}
                    >
                      <EuiCodeBlock
                        language="js"
                        fontSize="s"
                        paddingSize="s"
                        color="light"
                        overflowHeight={300}
                        isCopyable
                      >
                        {displaySearch}
                      </EuiCodeBlock>
                    </EuiFormRow>
                  )}
                </Fragment>
              )}

            {kibanaContext.currentSavedSearch !== undefined &&
              kibanaContext.currentSavedSearch.id !== undefined && (
                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineSummary.savedSearchLabel', {
                    defaultMessage: 'Saved search',
                  })}
                >
                  <span>{kibanaContext.currentSavedSearch.title}</span>
                </EuiFormRow>
              )}

            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.groupByLabel', {
                defaultMessage: 'Group by',
              })}
            >
              <GroupByListSummary list={groupByList} />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.aggregationsLabel', {
                defaultMessage: 'Aggregations',
              })}
            >
              <AggListSummary list={aggList} />
            </EuiFormRow>
          </EuiForm>
        </div>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
