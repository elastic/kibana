/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { FlyoutNode } from '../../components/flyout_node';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

export const FlyoutView = ({ node }: CapabilityViewProps<AppNodeOfType<'flyout'>>) => (
  <FlyoutNode node={node}>
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {node.children.map((child) => (
        <EuiFlexItem key={child.id} grow={false}>
          <NodeRenderer node={child} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </FlyoutNode>
);
