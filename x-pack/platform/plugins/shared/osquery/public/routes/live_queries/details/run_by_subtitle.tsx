/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';
import { RunByColumn } from '../../../actions/components/run_by_column';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

interface RunBySubtitleProps {
  data: LiveQueryDetailsItem;
}

const RunBySubtitleComponent: React.FC<RunBySubtitleProps> = ({ data }) => {
  const createdAt = data['@timestamp'];
  const userProfileUid = data.user_profile_uid;
  const userId = data.user_id;

  const profileItems = useMemo(
    () => (userProfileUid ? [{ userProfileUid }] : []),
    [userProfileUid]
  );

  const { profilesMap, isLoading } = useBulkGetUserProfiles(profileItems);

  const timestamp = formatDate(createdAt);

  if (!userId && !userProfileUid) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
        {i18n.translate('xpack.osquery.queryDetailsHeader.runByElastic', {
          defaultMessage: 'Run by: Elastic on {timestamp}',
          values: { timestamp },
        })}
      </EuiText>
    );
  }

  return (
    <EuiText size="s" color="subdued" data-test-subj="query-details-run-by">
      <FormattedMessage
        id="xpack.osquery.queryDetailsHeader.runByUser"
        defaultMessage="Run by: {user} on {timestamp}"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- extractor needs an inline values literal; React node cannot go through i18n.translate
        values={{
          user: (
            <RunByColumn
              userId={userId}
              userProfileUid={userProfileUid}
              profilesMap={profilesMap}
              isLoadingProfiles={isLoading}
            />
          ),
          timestamp,
        }}
      />
    </EuiText>
  );
};

RunBySubtitleComponent.displayName = 'RunBySubtitle';

export const RunBySubtitle = React.memo(RunBySubtitleComponent);
