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
  EuiPopover,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';

import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { IndexPatternSavedObject } from '../types';
import { GraphSourcePicker } from './graph_source_picker';

interface GraphSearchBarProps {
  isLoading: boolean;
  initialQuery?: string;
  currentIndexPattern?: IndexPatternSavedObject;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
}

export function GraphSearchBar({
  currentIndexPattern,
  onQuerySubmit,
  isLoading,
  onIndexPatternSelected,
  initialQuery,
  ...sourcePickerProps
}: GraphSearchBarProps) {
  const [open, setOpen] = useState(false);
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
              <EuiPopover
                id="graphSourcePicker"
                anchorPosition="downLeft"
                anchorClassName="gphSearchBar__datasourceButtonTooltip"
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
                        ? currentIndexPattern.attributes.title
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
                <GraphSourcePicker
                  onIndexPatternSelected={pattern => {
                    onIndexPatternSelected(pattern);
                    setOpen(false);
                  }}
                  currentIndexPattern={currentIndexPattern}
                  {...sourcePickerProps}
                />
              </EuiPopover>
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
