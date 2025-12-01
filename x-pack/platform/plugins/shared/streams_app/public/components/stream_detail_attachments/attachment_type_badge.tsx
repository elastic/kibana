/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';

export const ATTACHMENT_TYPE_CONFIG: Record<AttachmentType, { label: string; icon: EuiIconType }> =
  {
    dashboard: {
      label: i18n.translate('xpack.streams.attachmentTypeBadge.typeDashboard', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
    },
    rule: {
      label: i18n.translate('xpack.streams.attachmentTypeBadge.typeRule', {
        defaultMessage: 'Rule',
      }),
      icon: 'bell',
    },
    slo: {
      label: i18n.translate('xpack.streams.attachmentTypeBadge.typeSlo', {
        defaultMessage: 'SLO',
      }),
      icon: 'watchesApp',
    },
  };

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
