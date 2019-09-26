/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { uniqueId, startsWith } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { npStart } from 'ui/new_platform';
import { StaticIndexPattern, getFromSavedObject } from 'ui/index_patterns';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { KibanaLink } from '../Links/KibanaLink';
// @ts-ignore
import { Typeahead } from './Typeahead';
// @ts-ignore
import { getBoolFilter } from './get_bool_filter';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';
import { useMatchedRoutes } from '../../../hooks/useMatchedRoutes';
import { RouteName } from '../../app/Main/route_config/route_names';
import { useKibanaCore } from '../../../../../observability/public';
import { getAPMIndexPattern } from '../../../services/rest/savedObjects';
import { AutocompleteSuggestion } from '../../../../../../../../src/plugins/data/public';

const Container = styled.div`
  margin-bottom: 10px;
`;

const getAutocompleteProvider = (language: string) =>
  npStart.plugins.data.autocomplete.getProvider(language);

interface State {
  indexPattern: StaticIndexPattern | null;
  suggestions: AutocompleteSuggestion[];
  isLoadingIndexPattern: boolean;
  isLoadingSuggestions: boolean;
}

function convertKueryToEsQuery(
  kuery: string,
  indexPattern: StaticIndexPattern
) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

async function getAPMIndexPatternForKuery(): Promise<
  StaticIndexPattern | undefined
> {
  const apmIndexPattern = await getAPMIndexPattern();
  if (!apmIndexPattern) {
    return;
  }
  return getFromSavedObject(apmIndexPattern);
}

function getSuggestions(
  query: string,
  selectionStart: number,
  apmIndexPattern: StaticIndexPattern,
  boolFilter: unknown
) {
  const autocompleteProvider = getAutocompleteProvider('kuery');
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [apmIndexPattern],
    boolFilter
  });
  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart
  });
}

export function KueryBar() {
  const core = useKibanaCore();
  const [state, setState] = useState<State>({
    indexPattern: null,
    suggestions: [],
    isLoadingIndexPattern: true,
    isLoadingSuggestions: false
  });
  const { urlParams } = useUrlParams();
  const location = useLocation();
  const matchedRoutes = useMatchedRoutes();

  const apmIndexPatternTitle = core.injectedMetadata.getInjectedVar(
    'apmIndexPatternTitle'
  );
  const indexPatternMissing =
    !state.isLoadingIndexPattern && !state.indexPattern;
  let currentRequestCheck;

  const exampleMap: { [key: string]: string } = {
    [RouteName.TRANSACTIONS]: 'transaction.duration.us > 300000',
    [RouteName.ERRORS]: 'http.response.status_code >= 400',
    [RouteName.METRICS]: 'process.pid = "1234"'
  };

  // sets queryExample to the first matched example query, else default example
  const queryExample =
    matchedRoutes.map(({ name }) => exampleMap[name]).find(Boolean) ||
    'transaction.duration.us > 300000 AND http.response.status_code >= 400';

  useEffect(() => {
    let didCancel = false;

    async function loadIndexPattern() {
      setState(value => ({ ...value, isLoadingIndexPattern: true }));
      const indexPattern = await getAPMIndexPatternForKuery();
      if (didCancel) {
        return;
      }
      if (!indexPattern) {
        setState(value => ({ ...value, isLoadingIndexPattern: false }));
      } else {
        setState(value => ({
          ...value,
          indexPattern,
          isLoadingIndexPattern: false
        }));
      }
    }
    loadIndexPattern();

    return () => {
      didCancel = true;
    };
  }, []);

  async function onChange(inputValue: string, selectionStart: number) {
    const { indexPattern } = state;

    if (indexPattern === null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    const boolFilter = getBoolFilter(urlParams);
    try {
      const suggestions = (await getSuggestions(
        inputValue,
        selectionStart,
        indexPattern,
        boolFilter
      ))
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
    const { indexPattern } = state;

    if (indexPattern === null) {
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
        disabled={indexPatternMissing}
        isLoading={state.isLoadingSuggestions}
        initialValue={urlParams.kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        queryExample={queryExample}
      />

      {indexPatternMissing && (
        <EuiCallOut
          style={{ display: 'inline-block', marginTop: '10px' }}
          title={
            <div>
              <FormattedMessage
                id="xpack.apm.kueryBar.indexPatternMissingWarningMessage"
                defaultMessage="There's no APM index pattern with the title {apmIndexPatternTitle} available. To use the Query bar, please choose to import the APM index pattern via the {setupInstructionsLink}."
                values={{
                  apmIndexPatternTitle: `"${apmIndexPatternTitle}"`,
                  setupInstructionsLink: (
                    <KibanaLink path={`/home/tutorial/apm`}>
                      {i18n.translate(
                        'xpack.apm.kueryBar.setupInstructionsLinkLabel',
                        { defaultMessage: 'Setup Instructions' }
                      )}
                    </KibanaLink>
                  )
                }}
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
