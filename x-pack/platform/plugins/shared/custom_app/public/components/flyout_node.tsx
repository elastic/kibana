/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import { useAppRuntime, useOpenFlyoutId, useStateValues } from '../runtime/app_runtime_context';

interface FlyoutNodeProps {
  node: AppNodeOfType<'flyout'>;
  /** The node's rendered children. They are only mounted while the flyout is open. */
  children: ReactNode;
}

/**
 * Renders nothing until an action opens it, so the sources its content reads are only run while
 * it is open.
 */
export const FlyoutNode = ({ node, children }: FlyoutNodeProps) => {
  const runtime = useAppRuntime();
  const openFlyoutId = useOpenFlyoutId();
  const state = useStateValues();
  const titleId = useGeneratedHtmlId({ prefix: 'customAppFlyoutTitle' });

  if (openFlyoutId !== node.id) return null;

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={() => runtime.run([{ type: 'closeFlyout' }])}
      aria-labelledby={titleId}
      data-node-id={node.id}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{interpolate(node.title, state)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
