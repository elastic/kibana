/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import { StaticIndexPattern } from 'ui/index_patterns';

import { AutocompleteField } from '../../components/autocomplete_field';
import { KueryAutocompletion } from '../../containers/kuery_autocompletion';
import { NetworkFilter } from '../../containers/network';
import { networkModel, inputsModel } from '../../store';

import * as i18n from './translations';

interface NetworkKqlProps {
  indexPattern: StaticIndexPattern;
  type: networkModel.NetworkType;
  setQuery: (params: {
    id: string;
    inspect: null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }) => void;
}

export const NetworkKql = pure<NetworkKqlProps>(({ indexPattern, setQuery, type }) => (
  <KueryAutocompletion indexPattern={indexPattern}>
    {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
      <NetworkFilter indexPattern={indexPattern} setQuery={setQuery} type={type}>
        {({
          applyFilterQueryFromKueryExpression,
          filterQueryDraft,
          isFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression,
        }) => (
          <AutocompleteField
            data-test-subj="kqlInput"
            isLoadingSuggestions={isLoadingSuggestions}
            isValid={isFilterQueryDraftValid}
            loadSuggestions={loadSuggestions}
            onChange={setFilterQueryDraftFromKueryExpression}
            onSubmit={applyFilterQueryFromKueryExpression}
            placeholder={i18n.KQL_PLACEHOLDER}
            suggestions={suggestions}
            value={filterQueryDraft ? filterQueryDraft.expression : ''}
          />
        )}
      </NetworkFilter>
    )}
  </KueryAutocompletion>
));

NetworkKql.displayName = 'NetworkKql';
