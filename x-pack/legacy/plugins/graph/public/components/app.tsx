/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Storage } from 'ui/storage';
import { npStart } from 'ui/new_platform';
import { FieldManagerProps, FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
const localStorage = new Storage(window.localStorage);

export interface GraphAppProps extends FieldManagerProps, SearchBarProps {}

export function GraphApp(props: GraphAppProps) {
  return (
    <KibanaContextProvider
      services={{
        appName: 'graph',
        store: localStorage,
        autcomplete: npStart.plugins.data.autocomplete,
        ...npStart.core,
      }}
    >
      <div className="gphGraph__bar">
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <SearchBar {...props} />
          </EuiFlexItem>
          <EuiFlexItem>
            <FieldManager {...props} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </KibanaContextProvider>
  );
}
