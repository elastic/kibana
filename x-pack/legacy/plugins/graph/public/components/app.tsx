/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import { CoreStart } from 'kibana/public';
import { AutocompletePublicPluginStart } from 'src/plugins/data/public';
import { FieldManagerProps, FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';
import { GuidancePanel } from './guidance_panel';
import { selectedFieldsSelector } from '../state_management';
import { openSourceModal } from '../services/source_modal';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

export interface GraphAppProps extends FieldManagerProps, SearchBarProps {
  coreStart: CoreStart;
  autocompleteStart: AutocompletePublicPluginStart;
  store: Storage;
  onFillWorkspace: () => void;
  isInitialized: boolean;
}

export function GraphApp(props: GraphAppProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

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
        <div className="gphGraph__bar">
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <SearchBar {...props} />
            </EuiFlexItem>
            <EuiFlexItem>
              <FieldManager {...props} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        {!props.isInitialized && (
          <GuidancePanel
            hasDatasource={Boolean(props.currentIndexPattern)}
            hasFields={selectedFieldsSelector(props.state).length > 0}
            onFillWorkspace={props.onFillWorkspace}
            onOpenFieldPicker={() => {
              setPickerOpen(true);
            }}
            onOpenDatasourcePicker={() => {
              openSourceModal(props.coreStart, props.onIndexPatternSelected);
            }}
          />
        )}
      </KibanaContextProvider>
    </I18nProvider>
  );
}
