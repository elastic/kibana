/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useState } from 'react';

import { Storage } from 'ui/storage';
import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  QueryBarInput,
  Query,
  IndexPattern,
} from '../../../../../../src/legacy/core_plugins/data/public';
import { IndexPatternSavedObject } from '../types/app_state';
import { openSourceModal } from '../services/source_modal';

const localStorage = new Storage(window.localStorage);

export interface SearchBarProps {
  isLoading: boolean;
  currentIndexPattern?: IndexPattern;
  initialQuery?: string;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
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

export function SearchBar(props: SearchBarProps) {
  const {
    currentIndexPattern,
    onQuerySubmit,
    isLoading,
    onIndexPatternSelected,
    uiSettings,
    savedObjects,
    http,
    initialQuery,
  } = props;
  const [query, setQuery] = useState<Query>({ language: 'kuery', query: initialQuery || '' });
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
  );
}
