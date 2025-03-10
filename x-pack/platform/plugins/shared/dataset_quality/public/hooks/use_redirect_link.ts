/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { AggregateQuery, Query, buildPhraseFilter } from '@kbn/es-query';
import { getRouterLinkProps } from '@kbn/router-utils';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';
import { useMemo } from 'react';
import { BasicDataStream, DataStreamSelector, TimeRangeConfig } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';
import { SendTelemetryFn } from './use_redirect_link_telemetry';

export const useRedirectLink = <T extends BasicDataStream>({
  dataStreamStat,
  query,
  timeRangeConfig,
  breakdownField,
  sendTelemetry,
  selector,
}: {
  dataStreamStat: T;
  query?: Query | AggregateQuery;
  timeRangeConfig: TimeRangeConfig;
  breakdownField?: string;
  sendTelemetry: SendTelemetryFn;
  selector?: DataStreamSelector;
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
  ]);
};

const buildDiscoverConfig = <T extends BasicDataStream>({
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
  const dataViewNamespace = `${selector ? dataStreamStat.namespace : '*'}`;
  const dataViewSelector = selector ? `${selector}` : '';
  const dataViewId = `${dataStreamStat.type}-${dataStreamStat.name}-${dataViewNamespace}${dataViewSelector}`;
  const dataViewTitle = dataStreamStat.integration
    ? `[${dataStreamStat.integration.title}] ${dataStreamStat.name}-${dataViewNamespace}${dataViewSelector}`
    : `${dataViewId}`;

  const filters = selector
    ? []
    : [
        buildPhraseFilter(
          {
            name: 'data_stream.namespace',
            type: 'string',
          },
          dataStreamStat.namespace,
          {
            id: dataViewId,
            title: dataViewTitle,
          }
        ),
      ];

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
