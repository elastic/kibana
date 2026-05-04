/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type React from 'react';
import { useKibana } from './use_kibana';

/**
 * Returns a stable href and onClick handler for opening Discover with
 * `FROM <streamName> | SORT @timestamp DESC`.
 */
export const useStreamDiscoverLink = (
  streamName: string
): { href: string | undefined; onClick: (e?: React.MouseEvent) => void } => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const esqlQuery = `FROM ${streamName} | SORT @timestamp DESC`;

  const params: DiscoverAppLocatorParams = {
    query: { esql: esqlQuery },
  };

  const href = discoverLocator?.getRedirectUrl(params);

  const onClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    discoverLocator?.navigate(params);
  };

  return { href, onClick };
};
