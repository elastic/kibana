/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useState, useEffect } from 'react';

import { Storage } from 'ui/storage';
import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { IndexPatternSavedObject, IndexPatternProvider } from '../types';
import {
  QueryBarInput,
  Query,
  IndexPattern,
} from '../../../../../../src/legacy/core_plugins/data/public';
import { openSourceModal } from '../services/source_modal';
import {
  GraphState,
  datasourceSelector,
  requestDatasource,
  IndexpatternDatasource,
} from '../state_management';

const localStorage = new Storage(window.localStorage);

export interface SearchBarProps {
  isLoading: boolean;
  initialQuery?: string;
  currentDatasource?: IndexpatternDatasource;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  indexPatternProvider: IndexPatternProvider;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
  http: CoreStart['http'];
  overlays: CoreStart['overlays'];
}

function queryToString(query: Query, indexPattern: IndexPattern) {
  if (query.language === 'kuery' && typeof query.query === 'string') {
    const dsl = toElasticsearchQuery(fromKueryExpression(query.query as string), indexPattern);
    // JSON representation of query will be handled by existing logic.
    // TODO clean this up and handle it in the data fetch layer once
    // it moved to typescript.
    return JSON.stringify(dsl);
  }

  if (typeof query.query === 'string') {
    return query.query;
  }

  return JSON.stringify(query.query);
}

export function SearchBarComponent(props: SearchBarProps) {
  const {
    currentDatasource,
    onQuerySubmit,
    isLoading,
    onIndexPatternSelected,
    uiSettings,
    savedObjects,
    http,
    initialQuery,
    indexPatternProvider,
  } = props;
  const [query, setQuery] = useState<Query>({ language: 'kuery', query: initialQuery || '' });
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern | undefined>(
    undefined
  );

  useEffect(() => {
    async function fetchPattern() {
      if (currentDatasource) {
        setCurrentIndexPattern(await indexPatternProvider.get(currentDatasource.id));
      } else {
        setCurrentIndexPattern(undefined);
      }
    }
    fetchPattern();
  }, [currentDatasource]);

  return (
    <I18nProvider>
      <form
        className="gphSearchBar"
        onSubmit={e => {
          e.preventDefault();
          if (!isLoading && currentIndexPattern) {
            onQuerySubmit(queryToString(query, currentIndexPattern));
          }
        }}
      >
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <QueryBarInput
              disableAutoFocus
              bubbleSubmitEvent
              uiSettings={uiSettings}
              savedObjectsClient={savedObjects.client}
              http={http}
              query={query}
              indexPatterns={currentIndexPattern ? [currentIndexPattern] : []}
              store={localStorage}
              appName="graph"
              placeholder={i18n.translate('xpack.graph.bar.searchFieldPlaceholder', {
                defaultMessage: 'Search your data and add to your graph',
              })}
              prepend={
                <EuiToolTip
                  content={i18n.translate('xpack.graph.bar.pickSourceTooltip', {
                    defaultMessage: 'Click here to pick another data source',
                  })}
                >
                  <EuiButtonEmpty
                    size="xs"
                    className="gphSearchBar__datasourceButton"
                    data-test-subj="graphDatasourceButton"
                    onClick={() => {
                      openSourceModal(props, onIndexPatternSelected);
                    }}
                  >
                    {currentIndexPattern
                      ? currentIndexPattern.title
                      : // This branch will be shown if the user exits the
                        // initial picker modal
                        i18n.translate('xpack.graph.bar.pickSourceLabel', {
                          defaultMessage: 'Click here to pick a data source',
                        })}
                  </EuiButtonEmpty>
                </EuiToolTip>
              }
              onChange={setQuery}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill type="submit" disabled={isLoading || !currentIndexPattern}>
              {i18n.translate('xpack.graph.bar.exploreLabel', { defaultMessage: 'Explore' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </form>
    </I18nProvider>
  );
}

export const SearchBar = connect(
  (state: GraphState) => {
    const datasource = datasourceSelector(state);
    return {
      currentDatasource:
        datasource.current.type === 'indexpattern' ? datasource.current : undefined,
    };
  },
  dispatch => ({
    onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
      dispatch(
        requestDatasource({
          type: 'indexpattern',
          id: indexPattern.id,
          title: indexPattern.attributes.title,
        })
      );
    },
  })
)(SearchBarComponent);
