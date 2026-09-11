/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, formatDate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LiveHistoryRow } from '../../../../common/api/unified_history/types';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';
import { RunByColumn } from '../../../actions/components/run_by_column';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

interface RunBySubtitleProps {
  data: LiveQueryDetailsItem;
}

const RunBySubtitleComponent: React.FC<RunBySubtitleProps> = ({ data }) => {
  const actionId = data.action_id;
  const createdAt = data['@timestamp'];
  const userProfileUid = data.user_profile_uid;
  const userId = data.user_id;

  const profileItems = useMemo<LiveHistoryRow[]>(
    () =>
      userProfileUid
        ? [
            {
              id: actionId,
              sourceType: 'live',
              source: 'Live',
              timestamp: createdAt,
              queryText: '',
              agentCount: 0,
              successCount: undefined,
              errorCount: undefined,
              totalRows: undefined,
              userProfileUid,
              userId,
            },
          ]
        : [],
    [actionId, createdAt, userProfileUid, userId]
  );

  const { profilesMap, isLoading } = useBulkGetUserProfiles(profileItems);

  const timestamp = formatDate(createdAt);

  if (!userId && !userProfileUid) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
        <FormattedMessage
          id="xpack.osquery.queryDetailsHeader.runByElastic"
          defaultMessage="Run by: Elastic on {timestamp}"
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          values={{ timestamp }}
        />
      </EuiText>
    );
  }

  return (
    <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <FormattedMessage id="xpack.osquery.queryDetailsHeader.runBy" defaultMessage="Run by:" />
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
          <FormattedMessage
            id="xpack.osquery.queryDetailsHeader.runByOn"
            defaultMessage="on {timestamp}"
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            values={{ timestamp }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

RunBySubtitleComponent.displayName = 'RunBySubtitle';

export const RunBySubtitle = React.memo(RunBySubtitleComponent);
