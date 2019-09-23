/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { FieldManagerProps, FieldManager } from './field_manager';
import { SearchBarProps, SearchBar } from './search_bar';

export interface GraphAppProps extends FieldManagerProps, SearchBarProps {}

export function GraphApp(props: GraphAppProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
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
  );
}
