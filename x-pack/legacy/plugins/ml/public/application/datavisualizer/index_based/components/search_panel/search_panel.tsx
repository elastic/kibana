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
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { IndexPattern } from 'ui/index_patterns';

import { SEARCH_QUERY_LANGUAGE } from '../../../../../../common/constants/search';
import { SavedSearchQuery } from '../../../../contexts/kibana';

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
  const searchAllOptionText = i18n.translate('xpack.ml.datavisualizer.searchPanel.allOptionLabel', {
    defaultMessage: 'all',
  });

  const searchSizeOptions = [
    { value: '1000', text: '1000' },
    { value: '5000', text: '5000' },
    { value: '10000', text: '10000' },
    { value: '100000', text: '100000' },
    { value: '-1', text: searchAllOptionText },
  ];

  const searchHandler = (d: Record<string, any>) => {
    setSearchQuery(d.filterQuery);
  };

  return (
    <EuiPanel grow={false} data-test-subj="mlDataVisualizerSearchPanel">
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
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.ml.datavisualizer.searchPanel.sampleLabel"
            defaultMessage="Sample"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={searchSizeOptions}
            value={samplerShardSize}
            onChange={e => setSamplerShardSize(+e.target.value)}
            aria-label={i18n.translate('xpack.ml.datavisualizer.searchPanel.sampleSizeAriaLabel', {
              defaultMessage: 'Select number of documents to sample',
            })}
            data-test-subj="mlDataVisualizerShardSizeSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <FormattedMessage
              id="xpack.ml.datavisualizer.searchPanel.documentsPerShardLabel"
              defaultMessage="documents per shard from a total of {wrappedTotalCount} {totalCount, plural, one {document} other {documents}}"
              values={{
                wrappedTotalCount: (
                  <b data-test-subj="mlDataVisualizerTotalDocCount">{totalCount}</b>
                ),
                totalCount,
              }}
            />
          </span>
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
    </EuiPanel>
  );
};
