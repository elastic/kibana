/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Provider } from 'react-redux';
import { FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';
import { GraphStore } from '../state_management';

export interface GraphAppProps extends SearchBarProps {
  store: GraphStore;
}

export function GraphApp(props: GraphAppProps) {
  return (
    <Provider store={props.store}>
      <div className="gphGraph__bar">
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <SearchBar {...props} />
          </EuiFlexItem>
          <EuiFlexItem>
            <FieldManager />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </Provider>
  );
}
