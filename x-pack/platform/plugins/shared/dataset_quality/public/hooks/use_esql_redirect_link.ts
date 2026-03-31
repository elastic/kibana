/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { useMemo } from 'react';
import type { TimeRangeConfig } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';
import type { SendTelemetryFn } from './use_redirect_link_telemetry';

export const useEsqlRedirectLink = ({
  esqlQuery,
  timeRangeConfig,
  sendTelemetry,
}: {
  esqlQuery: string;
  timeRangeConfig: TimeRangeConfig;
  sendTelemetry: SendTelemetryFn;
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { from, to } = timeRangeConfig;

  return useMemo<{
    linkProps: RouterLinkProps;
    navigate: () => void;
  }>(() => {
    const params: DiscoverAppLocatorParams = {
      timeRange: {
        from,
        to,
      },
      query: { esql: esqlQuery },
    };

    const locator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
    const urlToDiscover = locator?.getRedirectUrl(params);

    const navigateToDiscover = () => {
      locator?.navigate(params) as Promise<void>;
    };

    const discoverLinkProps = getRouterLinkProps({
      href: urlToDiscover,
      onClick: navigateToDiscover,
    });

    const onClickWithTelemetry = (event: Parameters<RouterLinkProps['onClick']>[0]) => {
      sendTelemetry();
      discoverLinkProps.onClick(event);
    };

    const navigateWithTelemetry = () => {
      sendTelemetry();
      navigateToDiscover();
    };

    return {
      linkProps: {
        ...discoverLinkProps,
        onClick: onClickWithTelemetry,
      },
      navigate: navigateWithTelemetry,
    };
  }, [share.url.locators, esqlQuery, from, to, sendTelemetry]);
};
