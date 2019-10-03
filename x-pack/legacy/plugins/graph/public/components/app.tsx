/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Provider } from 'react-redux';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import { CoreStart } from 'kibana/public';
import { AutocompletePublicPluginStart } from 'src/plugins/data/public';
import { FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';
import { GraphStore } from '../state_management';
import { GuidancePanel } from './guidance_panel';
import { openSourceModal } from '../services/source_modal';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

export interface GraphAppProps extends SearchBarProps {
  coreStart: CoreStart;
  autocompleteStart: AutocompletePublicPluginStart;
  store: Storage;
  reduxStore: GraphStore;
  isInitialized: boolean;
  onFillWorkspace: () => void;
}

export function GraphApp(props: GraphAppProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { coreStart, autocompleteStart, store, reduxStore, ...searchBarProps } = props;

  return (
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'graph',
          store: props.store,
          autocomplete: props.autocompleteStart,
          ...props.coreStart,
        }}
      >
        <Provider store={reduxStore}>
          <>
            <div className="gphGraph__bar">
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <SearchBar {...searchBarProps} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <FieldManager pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            {!props.isInitialized && (
              <GuidancePanel
                onFillWorkspace={props.onFillWorkspace}
                onOpenFieldPicker={() => {
                  setPickerOpen(true);
                }}
              />
            )}
          </>
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>
  );
}
