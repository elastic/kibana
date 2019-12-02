/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { uniqueId, startsWith } from 'lodash';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { fromQuery, toQuery } from '../Links/url_helpers';
// @ts-ignore
import { Typeahead } from './Typeahead';
import { getBoolFilter } from './get_bool_filter';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';
import { usePlugins } from '../../../new-platform/plugin';
import { useDynamicIndexPattern } from '../../../hooks/useDynamicIndexPattern';
import {
  AutocompleteProvider,
  AutocompleteSuggestion,
  esKuery,
  IIndexPattern
} from '../../../../../../../../src/plugins/data/public';

const Container = styled.div`
  margin-bottom: 10px;
`;

interface State {
  suggestions: AutocompleteSuggestion[];
  isLoadingSuggestions: boolean;
}

function convertKueryToEsQuery(kuery: string, indexPattern: IIndexPattern) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, indexPattern);
}

function getSuggestions(
  query: string,
  selectionStart: number,
  indexPattern: IIndexPattern,
  boolFilter: unknown,
  autocompleteProvider?: AutocompleteProvider
) {
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [indexPattern],
    boolFilter
  });
  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart
  });
}

export function KueryBar() {
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingSuggestions: false
  });
  const { urlParams } = useUrlParams();
  const location = useLocation();
  const { data } = usePlugins();
  const autocompleteProvider = data.autocomplete.getProvider('kuery');

  let currentRequestCheck;

  const { processorEvent } = urlParams;

  const examples = {
    transaction: 'transaction.duration.us > 300000',
    error: 'http.response.status_code >= 400',
    metric: 'process.pid = "1234"',
    defaults:
      'transaction.duration.us > 300000 AND http.response.status_code >= 400'
  };

  const example = examples[processorEvent || 'defaults'];

  const { indexPattern } = useDynamicIndexPattern(processorEvent);

  async function onChange(inputValue: string, selectionStart: number) {
    if (indexPattern == null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    const boolFilter = getBoolFilter(urlParams);
    try {
      const suggestions = (
        await getSuggestions(
          inputValue,
          selectionStart,
          indexPattern,
          boolFilter,
          autocompleteProvider
        )
      )
        .filter(suggestion => !startsWith(suggestion.text, 'span.'))
        .slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setState({ ...state, suggestions, isLoadingSuggestions: false });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (indexPattern == null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      history.push({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          kuery: encodeURIComponent(inputValue.trim())
        })
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        isLoading={state.isLoadingSuggestions}
        initialValue={urlParams.kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        placeholder={i18n.translate('xpack.apm.kueryBar.placeholder', {
          defaultMessage: `Search {event, select,
            transaction {transactions}
            metric {metrics}
            error {errors}
            other {transactions, errors and metrics}
          } (E.g. {queryExample})`,
          values: {
            queryExample: example,
            event: processorEvent
          }
        })}
      />
    </Container>
  );
}
