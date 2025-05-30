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

import type { InstalledIntegrationsFilter, InstalledPackagesUIInstallationStatus } from '../types';

export function useAddUrlFilters() {
  const urlFilters = useUrlFilters();
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  return useCallback(
    (filters: Partial<InstalledIntegrationsFilter>) => {
      const newFilters = { ...urlFilters, ...filters };

      history.push({
        search: toUrlParams(
          {
            ...omit(urlParams, 'installationStatus', 'q'),
            // Reset current page when changing filters
            currentPage: '1',
            ...(Object.hasOwn(newFilters, 'installationStatus')
              ? { installationStatus: newFilters.installationStatus }
              : {}),
            ...(Object.hasOwn(newFilters, 'customIntegrations')
              ? { customIntegrations: newFilters.customIntegrations?.toString() }
              : {}),
            ...(Object.hasOwn(newFilters, 'q') ? { q: newFilters.q } : {}),
          },
          {
            skipEmptyString: true,
          }
        ),
      });
    },
    [urlFilters, urlParams, toUrlParams, history]
  );
}

export function useViewPolicies() {
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  const addViewPolicies = useCallback(
    (packageName: string) => {
      history.push({
        search: toUrlParams(
          {
            ...omit(urlParams, 'viewPolicies'),
            ...(packageName ? { viewPolicies: packageName } : {}),
          },
          {
            skipEmptyString: true,
          }
        ),
      });
    },
    [urlParams, toUrlParams, history]
  );

  const selectedPackageViewPolicies = useMemo(() => {
    if (typeof urlParams.viewPolicies === 'string') {
      return urlParams.viewPolicies;
    }
  }, [urlParams]);

  return {
    addViewPolicies,
    selectedPackageViewPolicies,
  };
}

export function useUrlFilters(): InstalledIntegrationsFilter {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    let installationStatus: InstalledIntegrationsFilter['installationStatus'];
    if (urlParams.installationStatus) {
      if (typeof urlParams.installationStatus === 'string') {
        installationStatus = [
          urlParams.installationStatus as InstalledPackagesUIInstallationStatus,
        ];
      } else {
        installationStatus =
          urlParams.installationStatus as InstalledPackagesUIInstallationStatus[];
      }
    }

    let q: InstalledIntegrationsFilter['q'];
    if (typeof urlParams.q === 'string') {
      q = urlParams.q;
    }

    let customIntegrations: InstalledIntegrationsFilter['customIntegrations'];
    if (
      typeof urlParams.customIntegrations === 'string' &&
      urlParams.customIntegrations === 'true'
    ) {
      customIntegrations = true;
    }

    return {
      installationStatus,
      customIntegrations,
      q,
    };
  }, [urlParams]);
}
