/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { buildPhraseFilter } from '@kbn/es-query';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import type { LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';
import { useMemo } from 'react';
import type { BasicDataStream, DataStreamSelector, TimeRangeConfig } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';
import type { SendTelemetryFn } from './use_redirect_link_telemetry';

export const useRedirectLink = <T extends BasicDataStream | string>({
  dataStreamStat,
  query,
  timeRangeConfig,
  breakdownField,
  sendTelemetry,
  selector,
  external = false,
}: {
  dataStreamStat: T;
  query?: Query | AggregateQuery;
  timeRangeConfig: TimeRangeConfig;
  breakdownField?: string;
  sendTelemetry: SendTelemetryFn;
  selector?: DataStreamSelector;
  external?: boolean;
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { from, to } = timeRangeConfig;

  return useMemo<{
    linkProps: RouterLinkProps;
    navigate: () => void;
    isLogsExplorerAvailable: boolean;
  }>(() => {
    const config = buildDiscoverConfig({
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
      // If the link is external, we don't want to use router link props handler because it would prevent the default behavior of the event and a new tab wouldn't be opened.
      if (config.routerLinkProps.onClick && !external) {
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
      isLogsExplorerAvailable: false,
    };
  }, [
    share.url.locators,
    dataStreamStat,
    query,
    from,
    to,
    breakdownField,
    selector,
    sendTelemetry,
    external,
  ]);
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
  const dataViewSelector = selector ? `${selector}` : '';
  if (dataStreamStat && typeof dataStreamStat === 'string') {
    const dataViewId = `${dataStreamStat}${dataViewSelector}`;
    return { dataViewId, dataViewTitle: dataViewId };
  }

  const { name, namespace, type, integration } = dataStreamStat as BasicDataStream;

  const dataViewNamespace = `${namespace || '*'}`;
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
