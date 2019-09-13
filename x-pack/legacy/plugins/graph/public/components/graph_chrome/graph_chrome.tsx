/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { CoreStart } from 'src/core/public';
import { GraphState, GraphDispatch, selectedFieldsSelector } from '../../state_management';
import { GraphFieldManager } from '../graph_field_manager';
import { EmptyOverlay } from './empty_overlay';
import { UnconfiguredOverlay } from './unconfigured_overlay';
import { IndexPatternSavedObject } from '../../types';
import { GraphSearchBar } from '../graph_search_bar';
import { SourcelessOverlay } from './sourceless_overlay';

export interface GraphChromeProps {
  state: GraphState;
  dispatch: GraphDispatch;
  onFillWorkspace: () => void;
  hasNodes: boolean;
  isLoading: boolean;
  initialQuery?: string;
  currentIndexPattern?: IndexPatternSavedObject;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  onQuerySubmit: (query: string) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
}

export function GraphChrome(props: GraphChromeProps) {
  const { onFillWorkspace, hasNodes, state, dispatch, ...searchBarProps } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasSelectedFields = selectedFieldsSelector(props.state).length > 0;

  return (
    <I18nProvider>
      <>
        <GraphSearchBar {...searchBarProps} />
        <GraphFieldManager
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          state={state}
          dispatch={dispatch}
        />
        {!props.currentIndexPattern && <SourcelessOverlay />}
        {props.currentIndexPattern && !hasSelectedFields && (
          <UnconfiguredOverlay
            onSelectFieldsClicked={() => {
              setPickerOpen(true);
            }}
          />
        )}
        {props.currentIndexPattern && hasSelectedFields && !hasNodes && (
          <EmptyOverlay onFillWorkspace={onFillWorkspace} />
        )}
      </>
    </I18nProvider>
  );
}
