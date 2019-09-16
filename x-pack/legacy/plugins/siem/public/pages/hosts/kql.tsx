/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import { StaticIndexPattern } from 'ui/index_patterns';

import { AutocompleteField } from '../../components/autocomplete_field';
import { HostsFilter } from '../../containers/hosts';
import { KueryAutocompletion } from '../../containers/kuery_autocompletion';
import { hostsModel, inputsModel } from '../../store';

import * as i18n from './translations';

interface HostsKqlProps {
  indexPattern: StaticIndexPattern;
  type: hostsModel.HostsType;
  setQuery: (params: {
    id: string;
    inspect: null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }) => void;
}

export const HostsKql = pure<HostsKqlProps>(({ indexPattern, setQuery, type }) => (
  <KueryAutocompletion indexPattern={indexPattern}>
    {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
      <HostsFilter indexPattern={indexPattern} setQuery={setQuery} type={type}>
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
      </HostsFilter>
    )}
  </KueryAutocompletion>
));

HostsKql.displayName = 'HostsKql';
