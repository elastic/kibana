/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiFieldSearch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { SEARCH_QUERY_LANGUAGE } from '../../../../../../common/constants/search';
import { SavedSearchQuery } from '../../../../contexts/ml';

// @ts-ignore
import { KqlFilterBar } from '../../../../components/kql_filter_bar/index';

interface Props {
  indexPattern: IndexPattern;
  searchString: string | SavedSearchQuery;
  setSearchString(s: string): void;
  searchQuery: string | SavedSearchQuery;
  setSearchQuery(q: string | SavedSearchQuery): void;
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE;
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
  totalCount: number;
}

const searchSizeOptions = [1000, 5000, 10000, 100000, -1].map(v => {
  return {
    value: String(v),
    inputDisplay:
      v > 0 ? (
        <FormattedMessage
          id="xpack.ml.datavisualizer.searchPanel.sampleSizeOptionLabel"
          defaultMessage="Sample size (per shard): {wrappedValue}"
          values={{ wrappedValue: <b>{v}</b> }}
        />
      ) : (
        <FormattedMessage
          id="xpack.ml.datavisualizer.searchPanel.allOptionLabel"
          defaultMessage="Search all"
        />
      ),
  };
});

export const SearchPanel: FC<Props> = ({
  indexPattern,
  searchString,
  setSearchString,
  searchQuery,
  setSearchQuery,
  searchQueryLanguage,
  samplerShardSize,
  setSamplerShardSize,
  totalCount,
}) => {
  const searchHandler = (d: Record<string, any>) => {
    setSearchQuery(d.filterQuery);
  };

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" data-test-subj="mlDataVisualizerSearchPanel">
      <EuiFlexItem>
        {searchQueryLanguage === SEARCH_QUERY_LANGUAGE.KUERY ? (
          <KqlFilterBar
            indexPattern={indexPattern}
            onSubmit={searchHandler}
            initialValue={searchString}
            placeholder={i18n.translate(
              'xpack.ml.datavisualizer.searchPanel.queryBarPlaceholderText',
              {
                defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
              }
            )}
          />
        ) : (
          <EuiForm>
            <EuiFormRow
              helpText={i18n.translate('xpack.ml.datavisualizer.searchPanel.kqlEditOnlyLabel', {
                defaultMessage: 'Currently only KQL saved searches can be edited',
              })}
            >
              <EuiFieldSearch
                value={`${searchString}`}
                readOnly
                data-test-subj="mlDataVisualizerLuceneSearchBarl"
              />
            </EuiFormRow>
          </EuiForm>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 270 }}>
            <EuiSuperSelect
              options={searchSizeOptions}
              valueOfSelected={String(samplerShardSize)}
              onChange={value => setSamplerShardSize(+value)}
              aria-label={i18n.translate(
                'xpack.ml.datavisualizer.searchPanel.sampleSizeAriaLabel',
                {
                  defaultMessage: 'Select number of documents to sample',
                }
              )}
              data-test-subj="mlDataVisualizerShardSizeSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.ml.datavisualizer.searchPanel.queryBarPlaceholder', {
                defaultMessage:
                  'Selecting a smaller sample size will reduce query run times and the load on the cluster.',
              })}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.datavisualizer.searchPanel.documentsPerShardLabel"
            defaultMessage="Total documents: {wrappedTotalCount}"
            values={{
              wrappedTotalCount: <b data-test-subj="mlDataVisualizerTotalDocCount">{totalCount}</b>,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} />
    </EuiFlexGroup>
  );
};
