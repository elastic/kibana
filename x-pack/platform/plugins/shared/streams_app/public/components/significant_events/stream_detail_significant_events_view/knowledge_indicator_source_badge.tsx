/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicatorSource } from '@kbn/significant-events-schema';
import React from 'react';
import {
  sourceDisplayKind,
  type KnowledgeIndicatorSourceDisplayKind,
} from './utils/get_knowledge_indicator_source';

const SOURCE_CONFIG: Record<
  KnowledgeIndicatorSourceDisplayKind,
  { label: string; color: string; tooltip: string }
> = {
  code: {
    label: i18n.translate('xpack.streams.significantEventsTable.source.codeLabel', {
      defaultMessage: 'Code',
    }),
    color: 'accent',
    tooltip: i18n.translate('xpack.streams.significantEventsTable.source.codeTooltip', {
      defaultMessage: 'Derived from source code',
    }),
  },
  logs: {
    label: i18n.translate('xpack.streams.significantEventsTable.source.logsLabel', {
      defaultMessage: 'Logs',
    }),
    color: 'hollow',
    tooltip: i18n.translate('xpack.streams.significantEventsTable.source.logsTooltip', {
      defaultMessage: 'Derived from log analysis',
    }),
  },
  both: {
    label: i18n.translate('xpack.streams.significantEventsTable.source.bothLabel', {
      defaultMessage: 'Code + Logs',
    }),
    color: 'success',
    tooltip: i18n.translate('xpack.streams.significantEventsTable.source.bothTooltip', {
      defaultMessage: 'Corroborated by both source code and log analysis',
    }),
  },
};

export function KnowledgeIndicatorSourceBadge({ source }: { source: KnowledgeIndicatorSource[] }) {
  const { label, color, tooltip } = SOURCE_CONFIG[sourceDisplayKind(source)];
  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge color={color}>{label}</EuiBadge>
    </EuiToolTip>
  );
}
