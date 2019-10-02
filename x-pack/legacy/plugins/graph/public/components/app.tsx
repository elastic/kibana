/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Storage } from 'ui/storage';
import { CoreStart } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { FieldManagerProps, FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

export interface GraphAppProps extends FieldManagerProps, SearchBarProps {
  coreStart: CoreStart;
  // This is not named dataStart because of Angular treating data- prefix differently
  pluginDataStart: DataPublicPluginStart;
  store: Storage;
}

export function GraphApp(props: GraphAppProps) {
  return (
    <KibanaContextProvider
      services={{
        appName: 'graph',
        store: props.store,
        data: props.pluginDataStart,
        ...props.coreStart,
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
