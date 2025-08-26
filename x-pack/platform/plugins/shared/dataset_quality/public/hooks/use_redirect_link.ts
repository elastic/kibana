/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppStatus } from '@kbn/core-application-browser';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import {
  type SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { AggregateQuery, Filter, Query, buildPhraseFilter } from '@kbn/es-query';
import { getRouterLinkProps } from '@kbn/router-utils';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import { BasicDataStream, DataStreamSelector, TimeRangeConfig } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';
import { SendTelemetryFn } from './use_redirect_link_telemetry';

export const useRedirectLink = <T extends BasicDataStream | string>({
  dataStreamStat,
  query,
  timeRangeConfig,
  breakdownField,
  sendTelemetry,
  selector,
  forceDiscover = false,
}: {
  dataStreamStat: T;
  query?: Query | AggregateQuery;
  timeRangeConfig: TimeRangeConfig;
  breakdownField?: string;
  sendTelemetry: SendTelemetryFn;
  selector?: DataStreamSelector;
  forceDiscover?: boolean;
}) => {
  const {
    services: { share, application },
  } = useKibanaContextForPlugin();

  const { from, to } = timeRangeConfig;

  const logsExplorerLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

  const isLogsExplorerAppAccessible = useObservable(
    useMemo(
      () =>
        application.applications$.pipe(
          map(
            (apps) =>
              (apps.get(OBSERVABILITY_LOGS_EXPLORER_APP_ID)?.status ?? AppStatus.inaccessible) ===
              AppStatus.accessible
          )
        ),
      [application.applications$]
    ),
    false
  );

  return useMemo<{
    linkProps: RouterLinkProps;
    navigate: () => void;
    isLogsExplorerAvailable: boolean;
  }>(() => {
    const isLogsExplorerAvailable =
      !forceDiscover &&
      isLogsExplorerAppAccessible &&
      !!logsExplorerLocator &&
      typeof dataStreamStat !== 'string' &&
      dataStreamStat.type === 'logs';
    const config = isLogsExplorerAvailable
      ? buildLogsExplorerConfig({
          locator: logsExplorerLocator,
          dataStreamStat,
          query,
          from,
          to,
          breakdownField,
        })
      : buildDiscoverConfig({
          locatorClient: share.url.locators,
          dataStreamStat,
          query,
          from,
          to,
          breakdownField,
          selector,
        });

    const onClickWithTelemetry = (event: Parameters<RouterLinkProps['onClick']>[0]) => {
      sendTelemetry();
      if (config.routerLinkProps.onClick) {
        config.routerLinkProps.onClick(event);
      }
    };

    const navigateWithTelemetry = () => {
      sendTelemetry();
      config.navigate();
    };

    return {
      linkProps: {
        ...config.routerLinkProps,
        onClick: onClickWithTelemetry,
      },
      navigate: navigateWithTelemetry,
      isLogsExplorerAvailable,
    };
  }, [
    isLogsExplorerAppAccessible,
    logsExplorerLocator,
    dataStreamStat,
    query,
    from,
    to,
    breakdownField,
    share.url.locators,
    selector,
    sendTelemetry,
    forceDiscover,
  ]);
};

const buildLogsExplorerConfig = <T extends BasicDataStream>({
  locator,
  dataStreamStat,
  query,
  from,
  to,
  breakdownField,
}: {
  locator: LocatorPublic<SingleDatasetLocatorParams>;
  dataStreamStat: T;
  query?: Query | AggregateQuery;
  from: string;
  to: string;
  breakdownField?: string;
}): {
  navigate: () => void;
  routerLinkProps: RouterLinkProps;
} => {
  const params: SingleDatasetLocatorParams = {
    dataset: dataStreamStat.name,
    timeRange: {
      from,
      to,
    },
    integration: dataStreamStat.integration?.name,
    query,
    filterControls: {
      namespace: {
        mode: 'include',
        values: [dataStreamStat.namespace],
      },
    },
    breakdownField,
  };

  const urlToLogsExplorer = locator.getRedirectUrl(params);

  const navigateToLogsExplorer = () => {
    locator.navigate(params) as Promise<void>;
  };

  const logsExplorerLinkProps = getRouterLinkProps({
    href: urlToLogsExplorer,
    onClick: navigateToLogsExplorer,
  });

  return { routerLinkProps: logsExplorerLinkProps, navigate: navigateToLogsExplorer };
};

const buildDiscoverConfig = <T extends BasicDataStream | string>({
  locatorClient,
  dataStreamStat,
  query,
  from,
  to,
  breakdownField,
  selector,
}: {
  locatorClient: LocatorClient;
  dataStreamStat: T;
  query?: Query | AggregateQuery;
  from: string;
  to: string;
  breakdownField?: string;
  selector?: DataStreamSelector;
}): {
  navigate: () => void;
  routerLinkProps: RouterLinkProps;
} => {
  const { dataViewId, dataViewTitle } = getDataView({
    dataStreamStat,
    selector,
  });

  const filters = getFilters({
    dataStreamStat,
    dataViewId,
    dataViewTitle,
    selector,
  });

  const params: DiscoverAppLocatorParams = {
    timeRange: {
      from,
      to,
    },
    refreshInterval: {
      pause: true,
      value: 60000,
    },
    dataViewId,
    dataViewSpec: {
      id: dataViewId,
      title: dataViewId,
      timeFieldName: '@timestamp',
    },
    query,
    breakdownField,
    columns: [],
    filters,
    interval: 'auto',
    sort: [['@timestamp', 'desc']],
  };

  const locator = locatorClient.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const urlToDiscover = locator?.getRedirectUrl(params);

  const navigateToDiscover = () => {
    locator?.navigate(params) as Promise<void>;
  };

  const discoverLinkProps = getRouterLinkProps({
    href: urlToDiscover,
    onClick: navigateToDiscover,
  });

  return { routerLinkProps: discoverLinkProps, navigate: navigateToDiscover };
};

const getDataView = <T extends BasicDataStream | string>({
  dataStreamStat,
  selector,
}: {
  dataStreamStat: T;
  selector?: DataStreamSelector;
}): { dataViewId: string; dataViewTitle: string } => {
  if (dataStreamStat && typeof dataStreamStat === 'string') {
    return { dataViewId: dataStreamStat, dataViewTitle: dataStreamStat };
  }

  const { name, namespace, type, integration } = dataStreamStat as BasicDataStream;

  const dataViewNamespace = `${namespace || '*'}`;
  const dataViewSelector = selector ? `${selector}` : '';
  const dataViewId = `${type}-${name}-${dataViewNamespace}${dataViewSelector}`;
  const dataViewTitle = integration
    ? `[${integration.title}] ${name}-${dataViewNamespace}${dataViewSelector}`
    : `${dataViewId}`;

  return { dataViewId, dataViewTitle };
};

const getFilters = <T extends BasicDataStream | string>({
  dataStreamStat,
  dataViewId,
  dataViewTitle,
  selector,
}: {
  dataStreamStat: T;
  dataViewId: string;
  dataViewTitle: string;
  selector?: DataStreamSelector;
}): Filter[] => {
  if (dataStreamStat && typeof dataStreamStat === 'string') {
    return [];
  }

  return selector
    ? []
    : [
        buildPhraseFilter(
          {
            name: 'data_stream.namespace',
            type: 'string',
          },
          (dataStreamStat as BasicDataStream).namespace,
          {
            id: dataViewId,
            title: dataViewTitle,
          }
        ),
      ];
};
