/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useContext } from 'react';
import { uniqueId, startsWith } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { Typeahead } from './typeahead';
import { getIndexPattern } from '../../../lib/adapters/index_pattern';
import { UptimeSettingsContext } from '../../../contexts';
import { useUrlParams } from '../../../hooks';
import { toStaticIndexPattern } from '../../../lib/helper';
import {
  AutocompleteProviderRegister,
  AutocompleteSuggestion,
  esKuery,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/public';

const Container = styled.div`
  margin-bottom: 10px;
`;

interface State {
  suggestions: AutocompleteSuggestion[];
  isLoadingIndexPattern: boolean;
}

function convertKueryToEsQuery(kuery: string, indexPattern: IIndexPattern) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, indexPattern);
}

function getSuggestions(
  query: string,
  selectionStart: number,
  apmIndexPattern: IIndexPattern,
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>
) {
  const autocompleteProvider = autocomplete.getProvider('kuery');
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true,
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [apmIndexPattern],
  });

  const suggestions = getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart,
  });
  return suggestions;
}

interface Props {
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>;
}

export function KueryBar({ autocomplete }: Props) {
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingIndexPattern: true,
  });
  const { basePath } = useContext(UptimeSettingsContext);
  const [indexPattern, setIndexPattern] = useState<any | undefined>(undefined);
  const [isLoadingIndexPattern, setIsLoadingIndexPattern] = useState<boolean>(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  let currentRequestCheck: string;

  useEffect(() => {
    getIndexPattern(basePath, (result: any) => setIndexPattern(toStaticIndexPattern(result)));
    setIsLoadingIndexPattern(false);
  }, []);
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { search: kuery } = getUrlParams();

  const indexPatternMissing = !isLoadingIndexPattern && !indexPattern;

  async function onChange(inputValue: string, selectionStart: number) {
    if (!indexPattern) {
      return;
    }

    setIsLoadingSuggestions(true);
    setState({ ...state, suggestions: [] });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    try {
      let suggestions = await getSuggestions(
        inputValue,
        selectionStart,
        indexPattern,
        autocomplete
      );
      suggestions = suggestions
        .filter((suggestion: AutocompleteSuggestion) => !startsWith(suggestion.text, 'span.'))
        .slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setIsLoadingSuggestions(false);
      setState({ ...state, suggestions });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (indexPattern === null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      updateUrlParams({ search: inputValue.trim() });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        disabled={indexPatternMissing}
        isLoading={isLoadingSuggestions}
        initialValue={kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        queryExample=""
      />

      {indexPatternMissing && (
        <EuiCallOut
          style={{ display: 'inline-block', marginTop: '10px' }}
          title={
            <div>
              <FormattedMessage
                id="xpack.uptime.kueryBar.indexPatternMissingWarningMessage"
                // TODO: we need to determine the best instruction to provide if the index pattern is missing
                defaultMessage="There was an error retrieving the index pattern."
              />
            </div>
          }
          color="warning"
          iconType="alert"
          size="s"
        />
      )}
    </Container>
  );
}
