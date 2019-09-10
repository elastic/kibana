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
} from '@elastic/eui';
import React, { useState } from 'react';

import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { IndexPatternSavedObject } from '../types/app_state';
import { GraphSourcePicker } from './graph_source_picker';

interface GraphSearchBarProps {
  currentIndexPattern?: IndexPatternSavedObject;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
}

export function GraphSearchBar({
  currentIndexPattern,
  onQuerySubmit,
  ...sourcePickerProps
}: GraphSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onQuerySubmit(query);
        setQuery('');
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            prepend={
              <EuiPopover
                id="graphSourcePicker"
                anchorPosition="downLeft"
                ownFocus
                button={
                  <EuiButtonEmpty onClick={() => setOpen(true)}>
                    {currentIndexPattern
                      ? currentIndexPattern.attributes.title
                      : i18n.translate('xpack.graph.bar.pickSourceLabel', {
                          defaultMessage: 'Click here to pick a data source',
                        })}
                  </EuiButtonEmpty>
                }
                isOpen={open}
                closePopover={() => setOpen(false)}
              >
                <GraphSourcePicker {...sourcePickerProps} />
              </EuiPopover>
            }
            value={query}
            onChange={({ target: { value } }) => setQuery(value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill type="submit">
            Explore
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
}
