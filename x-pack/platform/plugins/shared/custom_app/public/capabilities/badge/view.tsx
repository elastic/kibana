/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { CapabilityViewProps } from '../capability_views';

export const BadgeView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'badge'>>) => (
  <div data-node-id={node.id}>
    <EuiBadge color={node.color}>{text(node.text)}</EuiBadge>
  </div>
);
