/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMetadataItems } from '@kbn/app-header';
import { useBulkGetUserProfiles } from '../../../actions/use_user_profiles';

export interface UseRunByMetadataArgs {
  userId?: string;
  userProfileUid?: string;
  timestamp?: string;
}

const RUN_BY_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.runByLabel', {
  defaultMessage: 'Run by',
});

const ELASTIC_USER_NAME = i18n.translate('xpack.osquery.queryDetailsHeader.runByElasticName', {
  defaultMessage: 'Elastic',
});

const UNKNOWN_USER_NAME = '-';

/**
 * Single-item metadata row for a live run's header: "Run by <name> on <date>", text only (the
 * header metadata row has no avatar slot). Name resolution mirrors `RunByColumn`: "Elastic" when
 * the run has no triggering user, then the resolved profile, nothing while the profile is
 * loading, the raw user id, and "-" when nothing resolves. The run time is always shown.
 */
export const useRunByMetadata = ({
  userId,
  userProfileUid,
  timestamp,
}: UseRunByMetadataArgs): AppHeaderMetadataItems => {
  const profileItems = useMemo(
    () => (userProfileUid ? [{ userProfileUid }] : []),
    [userProfileUid]
  );
  const { profilesMap, isLoading } = useBulkGetUserProfiles(profileItems);

  return useMemo(() => {
    const getName = (): string | undefined => {
      if (!userId && !userProfileUid) {
        return ELASTIC_USER_NAME;
      }

      const profile = userProfileUid ? profilesMap.get(userProfileUid) : undefined;
      if (profile) {
        return profile.user.full_name || profile.user.username;
      }

      if (userProfileUid && isLoading && !profilesMap.has(userProfileUid)) {
        return undefined;
      }

      return userId || UNKNOWN_USER_NAME;
    };

    const name = getName();
    const formattedTimestamp = timestamp ? formatDate(timestamp) : undefined;

    if (!formattedTimestamp) {
      return [{ type: 'text', label: RUN_BY_LABEL, value: name }];
    }

    const value = name
      ? i18n.translate('xpack.osquery.queryDetailsHeader.runByValue', {
          defaultMessage: '{user} on {timestamp}',
          values: { user: name, timestamp: formattedTimestamp },
        })
      : i18n.translate('xpack.osquery.queryDetailsHeader.runByValueLoadingUser', {
          defaultMessage: 'on {timestamp}',
          values: { timestamp: formattedTimestamp },
        });

    return [{ type: 'text', label: RUN_BY_LABEL, value }];
  }, [isLoading, profilesMap, timestamp, userId, userProfileUid]);
};
