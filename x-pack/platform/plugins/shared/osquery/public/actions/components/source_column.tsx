/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UnifiedHistorySource } from '../../../common/api/unified_history/types';

const SOURCE_LABELS: Record<UnifiedHistorySource, string> = {
  Live: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.live', {
    defaultMessage: 'Live',
  }),
  Rule: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.rule', {
    defaultMessage: 'Rule',
  }),
  Workflow: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.workflow', {
    defaultMessage: 'Workflow',
  }),
  Scheduled: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumn.scheduled', {
    defaultMessage: 'Scheduled',
  }),
};

export const UNVERIFIED_WORKFLOW_TOOLTIP = i18n.translate(
  'xpack.osquery.liveQueryActions.table.sourceColumn.workflowUnverifiedTooltip',
  {
    defaultMessage:
      'Not verified. The request named a workflow run, but Kibana cannot yet confirm that the run sent it.',
  }
);

const UNVERIFIED_ICON_PROPS = { 'data-test-subj': 'sourceBadgeWorkflowUnverified' };

interface SourceBadgeProps {
  source: UnifiedHistorySource;
  /** Only read for `Workflow`: whether Kibana verified the run made the request. */
  originVerified?: boolean;
}

const SourceBadgeComponent: React.FC<SourceBadgeProps> = ({ source, originVerified }) => {
  if (source === 'Workflow' && !originVerified) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{SOURCE_LABELS[source]}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            color="subdued"
            size="s"
            content={UNVERIFIED_WORKFLOW_TOOLTIP}
            aria-label={UNVERIFIED_WORKFLOW_TOOLTIP}
            iconProps={UNVERIFIED_ICON_PROPS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <EuiText size="s">{SOURCE_LABELS[source]}</EuiText>;
};

SourceBadgeComponent.displayName = 'SourceBadge';

export const SourceBadge = React.memo(SourceBadgeComponent);
