/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { ApiService } from '../../lib/api';

export interface DirectUpgradeableVersionRange {
  min: string;
  max: string;
}

export type CloudStackVersionState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded';
      latestAvailableVersion: string;
      minVersionToUpgradeToLatest: string | null;
      directUpgradeableVersionRange: DirectUpgradeableVersionRange | null;
    };

export const useCloudStackVersionInfo = (
  api: Pick<ApiService, 'getCloudStackVersionInfo'>,
  currentVersion: string
): CloudStackVersionState => {
  const [cloudStackVersion, setCloudStackVersion] = useState<CloudStackVersionState>({
    status: 'loading',
  });

  useEffect(() => {
    let isSubscribed = true;
    setCloudStackVersion({ status: 'loading' });

    api
      .getCloudStackVersionInfo(currentVersion)
      .then(({ data, error }) => {
        if (!isSubscribed) return;

        if (error || !data?.latestAvailableVersion) {
          setCloudStackVersion({ status: 'error' });
          return;
        }

        setCloudStackVersion({
          status: 'loaded',
          latestAvailableVersion: data.latestAvailableVersion,
          minVersionToUpgradeToLatest: data.minVersionToUpgradeToLatest ?? null,
          directUpgradeableVersionRange: data.directUpgradeableVersionRange ?? null,
        });
      })
      .catch(() => {
        if (!isSubscribed) return;
        setCloudStackVersion({ status: 'error' });
      });

    return () => {
      isSubscribed = false;
    };
  }, [api, currentVersion]);

  return cloudStackVersion;
};
