/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { CapabilityViewProps } from '../capability_views';

export const HeadingView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'heading'>>) => (
  <EuiTitle size="s" data-node-id={node.id}>
    <h3>{text(node.text)}</h3>
  </EuiTitle>
);
