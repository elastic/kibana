/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { SerializableRecord } from '@kbn/utility-types';
import type { ValuesType } from 'utility-types';
import type { LocatorHost } from '@kbn/rule-data-utils';
import { resolveAlertingV2RuleLibraryHost } from '@kbn/alerting-v2-utils';

import { LOCATORS_IDS } from '../constants';

import { useStartServices } from './use_core';

export interface AlertingV2RuleLibraryLocatorParams extends SerializableRecord {
  templateId?: string;
  host?: LocatorHost;
}

export function useLocator<T extends SerializableRecord>(
  locatorId: ValuesType<typeof LOCATORS_IDS>
) {
  const services = useStartServices();
  return services.share.url.locators.get<T>(locatorId);
}

export function useDashboardLocator() {
  return useLocator(LOCATORS_IDS.DASHBOARD_APP);
}

export function useDiscoverLocator() {
  return useLocator(LOCATORS_IDS.DISCOVER_APP_LOCATOR);
}

export function useAlertingV2RuleLibraryLocator() {
  const { chrome, cloud, spaces } = useStartServices();
  const locator = useLocator<AlertingV2RuleLibraryLocatorParams>(
    LOCATORS_IDS.ALERTING_V2_RULE_LIBRARY
  );

  const solutionNavId = useObservable(
    chrome.getActiveSolutionNavId$(),
    chrome.getActiveSolutionNavId()
  );
  const space$ = useMemo(() => spaces?.getActiveSpace$() ?? EMPTY, [spaces]);
  const activeSpace = useObservable(space$);

  const host = resolveAlertingV2RuleLibraryHost({
    solutionNavId,
    projectType: cloud?.serverless?.projectType,
    spaceSolution: activeSpace?.solution,
  });

  return useMemo(() => {
    if (!locator || !host) {
      return locator;
    }

    const withHost = (
      params: AlertingV2RuleLibraryLocatorParams
    ): AlertingV2RuleLibraryLocatorParams => ({
      ...params,
      host: params.host ?? host,
    });

    return {
      ...locator,
      getLocation: (params: AlertingV2RuleLibraryLocatorParams) =>
        locator.getLocation(withHost(params)),
      getUrl: (
        params: AlertingV2RuleLibraryLocatorParams,
        getUrlParams?: Parameters<typeof locator.getUrl>[1]
      ) => locator.getUrl(withHost(params), getUrlParams),
      getRedirectUrl: (
        params: AlertingV2RuleLibraryLocatorParams,
        options?: Parameters<typeof locator.getRedirectUrl>[1]
      ) => locator.getRedirectUrl(withHost(params), options),
      navigate: (
        params: AlertingV2RuleLibraryLocatorParams,
        navigationParams?: Parameters<typeof locator.navigate>[1]
      ) => locator.navigate(withHost(params), navigationParams),
    };
  }, [locator, host]);
}
