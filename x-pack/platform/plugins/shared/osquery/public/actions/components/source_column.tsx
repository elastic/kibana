/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UnifiedHistorySource } from '../../../common/api/unified_history/types';

const SOURCE_LABELS: Record<UnifiedHistorySource, string> = {
  Live: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.live', {
    defaultMessage: 'Live',
  }),
  Rule: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.rule', {
    defaultMessage: 'Rule',
  }),
  Scheduled: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.scheduled', {
    defaultMessage: 'Scheduled',
  }),
};

interface SourceBadgeProps {
  source: UnifiedHistorySource;
}

const SourceBadgeComponent: React.FC<SourceBadgeProps> = ({ source }) => (
  <EuiText size="s">{SOURCE_LABELS[source]}</EuiText>
);

SourceBadgeComponent.displayName = 'SourceBadge';

export const SourceBadge = React.memo(SourceBadgeComponent);
