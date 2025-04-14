/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const PlaceHolderActionItem: React.FC = () => {
  return (
    <EuiPanel color="primary" paddingSize="s" grow={false}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceAround" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{'an action'}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

PlaceHolderActionItem.displayName = 'PlaceHolderActionItem';
