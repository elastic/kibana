/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
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
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { useKibana } from '../../common/lib/kibana';
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
}

const resultsHeadingCss = ({ euiTheme }: UseEuiTheme) => ({
  paddingRight: '20px',
  borderRight: euiTheme.border.thick,
});

const iconsListCss = {
  alignContent: 'center',
  justifyContent: 'center',
  paddingLeft: '10px',
};

export const PackResultsHeader = React.memo<PackResultsHeadersProps>(
  ({ actionId, agentIds, queryIds, addToTimeline, isScheduled }) => {
    const iconProps = useMemo(() => ({ color: 'text', size: 'xs', iconSize: 'l' } as const), []);
    const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
    const permissions = useKibana().services.application.capabilities.osquery;
    const canEditTags = !!permissions.writeLiveQueries;
    const showAddTags = isHistoryEnabled && canEditTags && !!actionId;

    const { data: liveQueryDetails } = useLiveQueryDetails({
      actionId,
      skip: !showAddTags || !!isScheduled,
    });

    const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
    const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);
    const handleCloseFlyout = useCallback(() => setIsFlyoutOpen(false), []);

    return (
      <>
        <EuiSpacer size={'l'} />
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem css={resultsHeadingCss} grow={false}>
            <EuiText>
              <h2>
                <FormattedMessage
                  id="xpack.osquery.liveQueryActionResults.results"
                  defaultMessage="Results"
                />
              </h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={iconsListCss} grow={false}>
            <span>
              {actionId && (
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <AddToCaseWrapper
                      actionId={actionId}
                      agentIds={agentIds}
                      isIcon={true}
                      iconProps={iconProps}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <AddToTimelineButton
                      field="action_id"
                      value={queryIds}
                      isIcon={true}
                      iconProps={iconProps}
                      addToTimeline={addToTimeline}
                    />
                  </EuiFlexItem>
                  {showAddTags && (
                    <EuiFlexItem>
                      <EuiToolTip
                        content={isScheduled ? SCHEDULED_TAGS_DISABLED_LABEL : ADD_TAGS_LABEL}
                      >
                        <EuiButtonIcon
                          iconType="tag"
                          color="text"
                          iconSize="l"
                          size="xs"
                          aria-label={ADD_TAGS_LABEL}
                          onClick={handleOpenFlyout}
                          isDisabled={isScheduled}
                          data-test-subj="add-tags-button"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </span>
          </EuiFlexItem>
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
