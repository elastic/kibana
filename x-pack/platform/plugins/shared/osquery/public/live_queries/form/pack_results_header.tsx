/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import { AddToCaseWrapper } from '../../cases/add_to_cases';
import { AddTagsFlyout } from '../../actions/components/add_tags_flyout';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { useKibana } from '../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { ExportResultsButton } from '../../results/export_results_button';
import { useExportFilters } from '../../results/export_filters_context';
import type { AddToTimelineHandler } from '../../types';

const ADD_TAGS_LABEL = i18n.translate('xpack.osquery.packResultsHeader.addTagsLabel', {
  defaultMessage: 'Add tags',
});

const SCHEDULED_TAGS_DISABLED_LABEL = i18n.translate(
  'xpack.osquery.packResultsHeader.scheduledTagsDisabledLabel',
  { defaultMessage: 'Tags are not supported for scheduled queries' }
);

const EMPTY_TAGS: string[] = [];

interface PackResultsHeadersProps {
  actionId?: string;
  queryIds: string[];
  agentIds?: string[];
  addToTimeline?: AddToTimelineHandler;
  isScheduled?: boolean;
  scheduleId?: string;
  executionCount?: number;
  onSaveQuery?: () => void;
}

const actionsGroupCss = {
  alignItems: 'center',
};

export const PackResultsHeader = React.memo<PackResultsHeadersProps>(
  ({
    actionId,
    agentIds,
    queryIds,
    addToTimeline,
    isScheduled,
    scheduleId,
    executionCount,
    onSaveQuery,
  }) => {
    const isExportEnabled = useIsExperimentalFeatureEnabled('exportResults');
    const permissions = useKibana().services.application.capabilities.osquery;
    const canEditTags = !!permissions.writeLiveQueries;
    const showAddTags = canEditTags && !!actionId;

    // Export is supported only when this header represents a single query
    // (live single-query view or scheduled execution). The pack overview has
    // multiple queries with different actionIds and per-query export remains
    // available via the row kebab menu.
    const exportQueryId = queryIds.length === 1 ? queryIds[0] : undefined;
    const showExport = isExportEnabled && !!exportQueryId;
    const exportFilters = useExportFilters(exportQueryId);

    const { data: liveQueryDetails } = useLiveQueryDetails({
      actionId,
      skip: !showAddTags || !!isScheduled,
    });

    const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
    const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);
    const handleCloseFlyout = useCallback(() => setIsFlyoutOpen(false), []);

    return (
      <>
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          justifyContent="spaceBetween"
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.osquery.liveQueryActionResults.results"
                  defaultMessage="Query results"
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
          {actionId && (
            <EuiFlexItem grow={false} css={actionsGroupCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                {showExport && exportQueryId && (
                  <EuiFlexItem grow={false}>
                    <ExportResultsButton
                      actionId={exportQueryId}
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
                <EuiFlexItem grow={false}>
                  <AddToCaseWrapper
                    actionId={actionId}
                    agentIds={agentIds}
                    isIcon={false}
                    size="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AddToTimelineButton
                    field="action_id"
                    value={queryIds}
                    addToTimeline={addToTimeline}
                    size="m"
                  />
                </EuiFlexItem>
                {showAddTags && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={isScheduled ? SCHEDULED_TAGS_DISABLED_LABEL : ADD_TAGS_LABEL}
                    >
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
                    <EuiButton
                      fill
                      size="m"
                      onClick={onSaveQuery}
                      data-test-subj="save-query-button"
                    >
                      <FormattedMessage
                        id="xpack.osquery.packResultsHeader.saveQueryButtonLabel"
                        defaultMessage="Save query"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size={'l'} />
        {isFlyoutOpen && actionId && (
          <AddTagsFlyout
            actionId={actionId}
            currentTags={liveQueryDetails?.tags ?? EMPTY_TAGS}
            onClose={handleCloseFlyout}
          />
        )}
      </>
    );
  }
);

PackResultsHeader.displayName = 'PackResultsHeader';
