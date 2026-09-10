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
  const profileItems = useMemo<LiveHistoryRow[]>(
    () =>
      data.user_profile_uid
        ? [
            {
              id: data.action_id,
              sourceType: 'live',
              source: 'Live',
              timestamp: data['@timestamp'],
              queryText: '',
              agentCount: 0,
              successCount: undefined,
              errorCount: undefined,
              totalRows: undefined,
              userProfileUid: data.user_profile_uid,
              userId: data.user_id,
            },
          ]
        : [],
    [data]
  );

  const { profilesMap, isLoading } = useBulkGetUserProfiles(profileItems);

  const timestamp = formatDate(data['@timestamp']);
  const elasticValues = useMemo(() => ({ timestamp }), [timestamp]);
  const onValues = useMemo(() => ({ timestamp }), [timestamp]);

  if (!data.user_id && !data.user_profile_uid) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
        <FormattedMessage
          id="xpack.osquery.queryDetailsHeader.runByElastic"
          defaultMessage="Run by: Elastic on {timestamp}"
          values={elasticValues}
        />
      </EuiText>
    );
  }

  // `RunByColumn` renders an EuiFlexGroup (a block-level box), which would break the
  // subtitle onto separate lines if inlined into flowing text. Lay the parts out as a
  // single non-wrapping flex row instead, and keep `RunByColumn` untouched — the packs
  // and saved-queries tables depend on its current markup.
  return (
    <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <FormattedMessage id="xpack.osquery.queryDetailsHeader.runBy" defaultMessage="Run by:" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RunByColumn
            userId={data.user_id}
            userProfileUid={data.user_profile_uid}
            profilesMap={profilesMap}
            isLoadingProfiles={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.osquery.queryDetailsHeader.runByOn"
            defaultMessage="on {timestamp}"
            values={onValues}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

RunBySubtitleComponent.displayName = 'RunBySubtitle';

export const RunBySubtitle = React.memo(RunBySubtitleComponent);
