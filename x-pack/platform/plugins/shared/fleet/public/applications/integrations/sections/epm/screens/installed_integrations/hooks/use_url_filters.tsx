/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';

import { useUrlParams } from '../../../../../../../hooks';

import type { InstalledIntegrationsFilter, PackageInstallationStatus } from '../types';

export function useAddUrlFilters() {
  const urlFilters = useUrlFilters();
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  return useCallback(
    (filters: Partial<InstalledIntegrationsFilter>) => {
      const newFilters = { ...urlFilters, ...filters };

      history.push({
        search: toUrlParams({
          ...omit(urlParams, 'installationStatus', 'q'),
          // Reset current page when changing filters
          currentPage: '1',
          ...(newFilters.installationStatus
            ? { installationStatus: newFilters.installationStatus }
            : {}),
          ...(newFilters.q ? { q: newFilters.q } : {}),
        }),
      });
    },
    [urlFilters, urlParams, toUrlParams, history]
  );
}

export function useUrlFilters(): InstalledIntegrationsFilter {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    let installationStatus: InstalledIntegrationsFilter['installationStatus'];
    if (urlParams.installationStatus) {
      if (typeof urlParams.installationStatus === 'string') {
        installationStatus = [urlParams.installationStatus as PackageInstallationStatus];
      } else {
        installationStatus = urlParams.installationStatus as PackageInstallationStatus[];
      }
    }

    let q: InstalledIntegrationsFilter['q'];
    if (typeof urlParams.q === 'string') {
      q = urlParams.q;
    }

    return {
      installationStatus,
      q,
    };
  }, [urlParams]);
}
