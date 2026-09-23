/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { removeMultilines } from '../../../../common/utils/build_query/remove_multilines';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { pagePathGetters } from '../../../common/page_paths';
import { useGoBack } from '../../../common/use_go_back';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';
import { RunByColumn } from '../../../actions/components/run_by_column';
import type { LiveHistoryRow } from '../../../../common/api/unified_history/types';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

const headerCss = ({ euiTheme }: UseEuiTheme) => ({
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
  background: euiTheme.colors.emptyShade,
  borderBottom: euiTheme.border.thin,
  padding: euiTheme.size.m,
});

const titleCss = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  margin: 0,
};

const titleRowCss = ({ euiTheme }: UseEuiTheme) => ({
  display: 'flex',
  alignItems: 'center',
  gap: euiTheme.size.s,
  minWidth: 0,
});

const titleGrowCss = {
  flex: '1 1 auto',
  minWidth: 0,
};

const actionsCss = {
  flexShrink: 0,
};

const backButtonCss = ({ euiTheme }: UseEuiTheme) => ({
  color: euiTheme.colors.textSubdued,
});

const descriptionLineCss = {
  p: {
    margin: 0,
    whiteSpace: 'nowrap' as const,
  },
};

const BACK_TO_HISTORY_LABEL = i18n.translate(
  'xpack.osquery.queryResultsChromeHeader.backToHistoryAriaLabel',
  { defaultMessage: 'Back to History' }
);

interface QueryResultsChromeHeaderProps {
  query: string;
  actions?: React.ReactNode;
  liveQuery?: LiveQueryDetailsItem;
  packName?: string;
  executionCount?: number;
  timestamp?: string;
  isScheduled?: boolean;
}

const RunByDescription = ({ data }: { data: LiveQueryDetailsItem }) => {
  const userProfileUid = data.user_profile_uid;
  const userId = data.user_id;
  const profileItems = useMemo(
    () => (userProfileUid ? [{ userProfileUid } as LiveHistoryRow] : []),
    [userProfileUid]
  );
  const { profilesMap, isLoading } = useBulkGetUserProfiles(profileItems);
  const timestamp = formatDate(data['@timestamp']);
  const onTimestamp = i18n.translate(
    'xpack.osquery.queryResultsChromeHeader.runByOnTimestampDetail',
    {
      defaultMessage: 'on {timestamp}',
      values: { timestamp },
    }
  );

  if (!userId && !userProfileUid) {
    return (
      <EuiText
        size="xs"
        color="subdued"
        css={descriptionLineCss}
        data-test-subj="query-details-run-by"
      >
        {i18n.translate('xpack.osquery.queryResultsChromeHeader.runByElasticDescription', {
          defaultMessage: 'Run by: Elastic on {timestamp}',
          values: { timestamp },
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      data-test-subj="query-details-run-by"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" css={descriptionLineCss}>
          <FormattedMessage
            id="xpack.osquery.queryResultsChromeHeader.runByPrefixDetail"
            defaultMessage="Run by:"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RunByColumn
          userId={userId}
          userProfileUid={userProfileUid}
          profilesMap={profilesMap}
          isLoadingProfiles={isLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" css={descriptionLineCss}>
          {onTimestamp}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ScheduledDescription = ({
  packName,
  executionCount,
  timestamp,
}: {
  packName?: string;
  executionCount?: number;
  timestamp?: string;
}) => {
  const formattedTimestamp = timestamp ? formatDate(timestamp) : '';
  const execution = executionCount != null ? String(executionCount) : '';

  return (
    <EuiText size="xs" color="subdued" data-test-subj="query-details-scheduled-run">
      {packName
        ? i18n.translate('xpack.osquery.queryResultsChromeHeader.scheduledRunWithPackDescription', {
            defaultMessage:
              'Scheduled run of {packName} · Execution #{executionCount} on {timestamp}',
            values: { packName, executionCount: execution, timestamp: formattedTimestamp },
          })
        : i18n.translate('xpack.osquery.queryResultsChromeHeader.scheduledRunDescription', {
            defaultMessage: 'Scheduled run · Execution #{executionCount} on {timestamp}',
            values: { executionCount: execution, timestamp: formattedTimestamp },
          })}
    </EuiText>
  );
};

const QueryResultsChromeHeaderComponent: React.FC<QueryResultsChromeHeaderProps> = ({
  query,
  actions,
  liveQuery,
  packName,
  executionCount,
  timestamp,
  isScheduled,
}) => {
  const historyPath = pagePathGetters.history();
  const handleGoBack = useGoBack(historyPath);
  const historyNavProps = useRouterNavigate(historyPath, handleGoBack);
  const oneLine = removeMultilines(query);

  const description = isScheduled ? (
    <ScheduledDescription
      packName={packName}
      executionCount={executionCount}
      timestamp={timestamp}
    />
  ) : (
    liveQuery && <RunByDescription data={liveQuery} />
  );

  return (
    <div css={headerCss} data-test-subj="query-results-chrome-header">
      <div css={titleRowCss}>
        <EuiToolTip content={BACK_TO_HISTORY_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="sortLeft"
            color="text"
            display="empty"
            size="xs"
            css={backButtonCss}
            data-test-subj="query-results-chrome-back"
            {...historyNavProps}
            aria-label={BACK_TO_HISTORY_LABEL}
          />
        </EuiToolTip>
        <div css={titleGrowCss}>
          <EuiTitle size="s">
            <h1 css={titleCss} title={oneLine} data-test-subj="query-details-title">
              {oneLine}
            </h1>
          </EuiTitle>
        </div>
        {actions ? <div css={actionsCss}>{actions}</div> : null}
      </div>
      {description}
    </div>
  );
};

export const QueryResultsChromeHeader = React.memo(QueryResultsChromeHeaderComponent);
