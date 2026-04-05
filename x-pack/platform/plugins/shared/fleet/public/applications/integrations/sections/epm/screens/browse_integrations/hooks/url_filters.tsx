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
import { dataTypes } from '../../../../../../../../common/constants';

import type {
  BrowseIntegrationsFilter,
  BrowseIntegrationSortType,
  IntegrationStatusFilterType,
  SetupMethodFilterType,
  SignalFilterType,
} from '../types';

const VALID_STATUSES: IntegrationStatusFilterType[] = ['deprecated'];
const VALID_SETUP_METHODS: SetupMethodFilterType[] = ['agentless', 'elastic_agent'];
const VALID_SIGNALS: SignalFilterType[] = Object.values(dataTypes);
const INTEGRATIONS_QUERYPARAM_Q = 'q';
const INTEGRATIONS_QUERYPARAM_SORT = 'sort';
const INTEGRATIONS_QUERYPARAM_STATUS = 'status';
const INTEGRATIONS_QUERYPARAM_SETUP_METHOD = 'setupMethod';
const INTEGRATIONS_QUERYPARAM_SIGNAL = 'signal';

function isValidStatus(value: string): value is IntegrationStatusFilterType {
  return (VALID_STATUSES as string[]).includes(value);
}

function isValidSetupMethod(value: string): value is SetupMethodFilterType {
  return (VALID_SETUP_METHODS as string[]).includes(value);
}

function isValidSignal(value: string): value is SignalFilterType {
  return (VALID_SIGNALS as string[]).includes(value);
}

export function useAddUrlFilters() {
  const urlFilters = useUrlFilters();
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  return useCallback(
    (filters: Partial<BrowseIntegrationsFilter>, options?: { replace?: boolean }) => {
      const newFilters = { ...urlFilters, ...filters };

      const method = options?.replace ? history.replace : history.push;

      method.call(history, {
        search: toUrlParams(
          {
            ...omit(
              urlParams,
              INTEGRATIONS_QUERYPARAM_Q,
              INTEGRATIONS_QUERYPARAM_SORT,
              INTEGRATIONS_QUERYPARAM_STATUS,
              INTEGRATIONS_QUERYPARAM_SETUP_METHOD,
              INTEGRATIONS_QUERYPARAM_SIGNAL
            ),
            ...(newFilters.q ? { q: newFilters.q } : {}),
            ...(newFilters.sort ? { sort: newFilters.sort } : {}),
            ...(newFilters.status && newFilters.status.length > 0
              ? { status: newFilters.status }
              : {}),
            ...(newFilters.setupMethod && newFilters.setupMethod.length > 0
              ? { setupMethod: newFilters.setupMethod }
              : {}),
            ...(newFilters.signal && newFilters.signal.length > 0
              ? { signal: newFilters.signal }
              : {}),
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

export function useUrlFilters(): BrowseIntegrationsFilter {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    let q: BrowseIntegrationsFilter[typeof INTEGRATIONS_QUERYPARAM_Q];
    if (typeof urlParams[INTEGRATIONS_QUERYPARAM_Q] === 'string') {
      q = urlParams.q;
    }

    let sort: BrowseIntegrationsFilter[typeof INTEGRATIONS_QUERYPARAM_SORT];
    if (typeof urlParams.sort === 'string' && isValidSortType(urlParams.sort)) {
      sort = urlParams.sort;
    }

    let status: BrowseIntegrationsFilter[typeof INTEGRATIONS_QUERYPARAM_STATUS];
    const rawStatus = urlParams.status;
    if (typeof rawStatus === 'string') {
      // Single value: ?status=deprecated
      if (isValidStatus(rawStatus)) {
        status = [rawStatus];
      }
    } else if (Array.isArray(rawStatus)) {
      // currently there's only one status filter but we can have more in the future
      const validStatuses = rawStatus.filter(
        (s): s is IntegrationStatusFilterType => typeof s === 'string' && isValidStatus(s)
      );
      if (validStatuses.length > 0) {
        status = validStatuses;
      }
    }

    let setupMethod: BrowseIntegrationsFilter[typeof INTEGRATIONS_QUERYPARAM_SETUP_METHOD];
    const rawSetupMethod = urlParams[INTEGRATIONS_QUERYPARAM_SETUP_METHOD];
    if (typeof rawSetupMethod === 'string') {
      if (isValidSetupMethod(rawSetupMethod)) {
        setupMethod = [rawSetupMethod];
      }
    } else if (Array.isArray(rawSetupMethod)) {
      const validMethods = rawSetupMethod.filter(
        (s): s is SetupMethodFilterType => typeof s === 'string' && isValidSetupMethod(s)
      );
      if (validMethods.length > 0) {
        setupMethod = validMethods;
      }
    }

    let signal: BrowseIntegrationsFilter[typeof INTEGRATIONS_QUERYPARAM_SIGNAL];
    const rawSignal = urlParams[INTEGRATIONS_QUERYPARAM_SIGNAL];
    if (typeof rawSignal === 'string') {
      if (isValidSignal(rawSignal)) {
        signal = [rawSignal];
      }
    } else if (Array.isArray(rawSignal)) {
      const validSignals = rawSignal.filter(
        (s): s is SignalFilterType => typeof s === 'string' && isValidSignal(s)
      );
      if (validSignals.length > 0) {
        signal = validSignals;
      }
    }

    return {
      q,
      sort,
      status,
      setupMethod,
      signal,
    };
  }, [urlParams]);
}

function isValidSortType(sort: string): sort is BrowseIntegrationSortType {
  return ['recent-old', 'old-recent', 'a-z', 'z-a'].includes(sort);
}
