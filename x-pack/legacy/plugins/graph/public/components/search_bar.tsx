/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPopover,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';

import { Storage } from 'ui/storage';
import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  QueryBarInput,
  Query,
  IndexPattern,
} from '../../../../../../src/legacy/core_plugins/data/public';
import { IndexPatternSavedObject } from '../types/app_state';
import { SourcePicker } from './source_picker';

const localStorage = new Storage(window.localStorage);

interface SearchBarProps {
  isLoading: boolean;
  currentIndexPattern?: IndexPattern;
  initialQuery?: string;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
  http: CoreStart['http'];
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

export function SearchBar({
  currentIndexPattern,
  onQuerySubmit,
  isLoading,
  onIndexPatternSelected,
  uiSettings,
  savedObjects,
  http,
  initialQuery,
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<Query>({ language: 'kuery', query: initialQuery || '' });
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
                <EuiPopover
                  id="graphSourcePicker"
                  anchorPosition="downLeft"
                  ownFocus
                  button={
                    <EuiToolTip
                      content={i18n.translate('xpack.graph.bar.pickSourceTooltip', {
                        defaultMessage: 'Click here to pick another data source',
                      })}
                    >
                      <EuiButtonEmpty
                        size="xs"
                        className="gphSearchBar__datasourceButton"
                        onClick={() => setOpen(true)}
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
                  isOpen={open}
                  closePopover={() => setOpen(false)}
                >
                  <SourcePicker
                    onIndexPatternSelected={pattern => {
                      onIndexPatternSelected(pattern);
                      setOpen(false);
                    }}
                    currentIndexPattern={currentIndexPattern}
                    uiSettings={uiSettings}
                    savedObjects={savedObjects}
                  />
                </EuiPopover>
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
