/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
import { ATTACHMENT_TYPE_CONFIG } from './attachment_constants';

interface AttachmentTypeBadgeProps {
  type: AttachmentType;
}

export function AttachmentTypeBadge({ type }: AttachmentTypeBadgeProps) {
  const config = ATTACHMENT_TYPE_CONFIG[type];

  return (
    <EuiBadge color="hollow">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={config.icon} size="s" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{config.label}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
}
