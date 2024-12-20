/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LogCategory } from '../../types';

export const logCategoriesGridChangeTypeColumn = {
  id: 'change_type' as const,
  display: i18n.translate(
    'xpack.observabilityLogsOverview.logCategoriesGrid.changeTypeColumnLabel',
    {
      defaultMessage: 'Change type',
    }
  ),
  isSortable: true,
  initialWidth: 110,
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridChangeTypeCellProps {
  logCategory: LogCategory;
}

export const LogCategoriesGridChangeTypeCell: React.FC<LogCategoriesGridChangeTypeCellProps> = ({
  logCategory,
}) => {
  switch (logCategory.change.type) {
    case 'dip':
      return <EuiBadge color="hollow">{dipBadgeLabel}</EuiBadge>;
    case 'spike':
      return <EuiBadge color="hollow">{spikeBadgeLabel}</EuiBadge>;
    case 'step':
      return <EuiBadge color="hollow">{stepBadgeLabel}</EuiBadge>;
    case 'distribution':
      return <EuiBadge color="hollow">{distributionBadgeLabel}</EuiBadge>;
    case 'rare':
      return <EuiBadge color="hollow">{rareBadgeLabel}</EuiBadge>;
    case 'trend':
      return <EuiBadge color="hollow">{trendBadgeLabel}</EuiBadge>;
    case 'other':
      return <EuiBadge color="hollow">{otherBadgeLabel}</EuiBadge>;
    case 'none':
      return <>-</>;
    default:
      return <EuiBadge color="hollow">{unknownBadgeLabel}</EuiBadge>;
  }
};

const dipBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.dipChangeTypeBadgeLabel',
  {
    defaultMessage: 'Dip',
  }
);

const spikeBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.spikeChangeTypeBadgeLabel',
  {
    defaultMessage: 'Spike',
  }
);

const stepBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.spikeChangeTypeBadgeLabel',
  {
    defaultMessage: 'Step',
  }
);

const distributionBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.distributionChangeTypeBadgeLabel',
  {
    defaultMessage: 'Distribution',
  }
);

const trendBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.spikeChangeTypeBadgeLabel',
  {
    defaultMessage: 'Trend',
  }
);

const otherBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.otherChangeTypeBadgeLabel',
  {
    defaultMessage: 'Other',
  }
);

const unknownBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.unknownChangeTypeBadgeLabel',
  {
    defaultMessage: 'Unknown',
  }
);

const rareBadgeLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.rareChangeTypeBadgeLabel',
  {
    defaultMessage: 'Rare',
  }
);
