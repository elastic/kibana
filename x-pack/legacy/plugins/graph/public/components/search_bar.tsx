/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { IDataPluginServices } from 'src/legacy/core_plugins/data/public/types';
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

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export interface OuterSearchBarProps {
  isLoading: boolean;
  initialQuery?: string;
  onQuerySubmit: (query: string) => void;
  confirmWipeWorkspace: (onConfirm: () => void) => void;
  indexPatternProvider: IndexPatternProvider;
}

export interface SearchBarProps extends OuterSearchBarProps {
  currentDatasource?: IndexpatternDatasource;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
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
    initialQuery,
    indexPatternProvider,
    confirmWipeWorkspace,
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

  const kibana = useKibana<IDataPluginServices>();
  const { overlays, savedObjects, uiSettings } = kibana.services;
  if (!overlays) return null;

  return (
    <form
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
            indexPatterns={currentIndexPattern ? [currentIndexPattern] : []}
            placeholder={i18n.translate('xpack.graph.bar.searchFieldPlaceholder', {
              defaultMessage: 'Search your data and add to your graph',
            })}
            query={query}
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
                    confirmWipeWorkspace(() =>
                      openSourceModal(
                        { overlays, savedObjects, uiSettings },
                        onIndexPatternSelected
                      )
                    );
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
