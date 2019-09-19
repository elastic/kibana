/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';

import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { IndexPatternSavedObject } from '../types';
import { openSourceModal } from '../services/source_modal';
import {
  GraphState,
  datasourceSelector,
  requestDatasource,
  IndexpatternDatasource,
} from '../state_management';

export interface SearchBarProps {
  isLoading: boolean;
  initialQuery?: string;
  currentIndexPattern?: IndexpatternDatasource;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
  overlays: CoreStart['overlays'];
}

function SearchBarComponent({
  currentIndexPattern,
  onQuerySubmit,
  isLoading,
  onIndexPatternSelected,
  initialQuery,
  ...sourcePickerProps
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery || '');
  return (
    <form
      className="gphSearchBar"
      onSubmit={e => {
        e.preventDefault();
        if (!isLoading && currentIndexPattern) {
          onQuerySubmit(query);
        }
      }}
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            isLoading={isLoading}
            icon="search"
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
                    openSourceModal(sourcePickerProps, onIndexPatternSelected);
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
            value={query}
            onChange={({ target: { value } }) => setQuery(value)}
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
      currentIndexPattern:
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
