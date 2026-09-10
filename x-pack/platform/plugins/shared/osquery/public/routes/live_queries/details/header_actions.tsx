/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AddToTimelineButton } from '../../../timelines/add_to_timeline_button';
import { AddToCaseWrapper } from '../../../cases/add_to_cases';
import { AddTagsFlyout } from '../../../actions/components/add_tags_flyout';
import { useKibana } from '../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';
import { ExportResultsButton } from '../../../results/export_results_button';
import { useExportFilters } from '../../../results/export_filters_context';
import { ViewInDropdown } from './view_in_dropdown';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

const ADD_TAGS_LABEL = i18n.translate('xpack.osquery.packResultsHeader.addTagsLabel', {
  defaultMessage: 'Add tags',
});

const SCHEDULED_TAGS_DISABLED_LABEL = i18n.translate(
  'xpack.osquery.packResultsHeader.scheduledTagsDisabledLabel',
  { defaultMessage: 'Tags are not supported for scheduled queries' }
);

const EMPTY_TAGS: string[] = [];

interface HeaderActionsProps {
  actionId: string;
  data: LiveQueryDetailsItem;
  onSaveQuery?: () => void;
  scheduleId?: string;
  executionCount?: number;
  viewInStartDate?: string;
  viewInEndDate?: string;
}

const HeaderActionsComponent: React.FC<HeaderActionsProps> = ({
  actionId,
  data,
  onSaveQuery,
  scheduleId,
  executionCount,
  viewInStartDate,
  viewInEndDate,
}) => {
  const isScheduled = !!scheduleId && executionCount != null;
  const isExportEnabled = useIsExperimentalFeatureEnabled('exportResults');
  const permissions = useKibana().services.application.capabilities.osquery;
  const canEditTags = !!permissions.writeLiveQueries && !!actionId;

  const query = data.queries?.[0];
  const queryActionId = query?.action_id;
  const timelineValue = useMemo(() => (queryActionId ? [queryActionId] : []), [queryActionId]);
  const agentIds = data.agents;

  const exportFilters = useExportFilters(queryActionId);

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const handleCloseFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        data-test-subj="query-details-header-actions"
      >
        {isExportEnabled && queryActionId && (
          <EuiFlexItem grow={false}>
            <ExportResultsButton
              actionId={queryActionId}
              isLive={!scheduleId}
              liveQueryId={actionId}
              scheduleId={scheduleId}
              executionCount={executionCount}
              kuery={exportFilters?.kuery}
              activeFilters={exportFilters?.activeFilters}
              filteredTotal={exportFilters?.filteredTotal}
              total={exportFilters?.total}
            />
          </EuiFlexItem>
        )}
        {queryActionId && (
          <EuiFlexItem grow={false}>
            <ViewInDropdown
              actionId={queryActionId}
              startDate={viewInStartDate ?? data['@timestamp']}
              endDate={viewInEndDate ?? data.expiration}
              scheduleId={scheduleId}
              executionCount={executionCount}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <AddToCaseWrapper actionId={actionId} agentIds={agentIds} isIcon={false} size="m" />
        </EuiFlexItem>
        {queryActionId && (
          <EuiFlexItem grow={false}>
            <AddToTimelineButton field="action_id" value={timelineValue} size="m" />
          </EuiFlexItem>
        )}
        {canEditTags && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={isScheduled ? SCHEDULED_TAGS_DISABLED_LABEL : ADD_TAGS_LABEL}>
              <EuiButtonEmpty
                size="m"
                iconType="tag"
                color="primary"
                onClick={handleOpenFlyout}
                isDisabled={isScheduled}
                data-test-subj="add-tags-button"
              >
                {ADD_TAGS_LABEL}
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {onSaveQuery && (
          <EuiFlexItem grow={false}>
            <EuiButton fill size="m" onClick={onSaveQuery} data-test-subj="save-query-button">
              <FormattedMessage
                id="xpack.osquery.packResultsHeader.saveQueryButtonLabel"
                defaultMessage="Save query"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isFlyoutOpen && (
        <AddTagsFlyout
          actionId={actionId}
          currentTags={data.tags ?? EMPTY_TAGS}
          onClose={handleCloseFlyout}
        />
      )}
    </>
  );
};

HeaderActionsComponent.displayName = 'HeaderActions';

export const HeaderActions = React.memo(HeaderActionsComponent);
