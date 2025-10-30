/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ConversationFlyoutProps } from './types';

export const ConversationFlyout = ({
  onClose,
  ConversationComponent,
  ...embeddableProps
}: ConversationFlyoutProps) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <ConversationComponent {...embeddableProps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
