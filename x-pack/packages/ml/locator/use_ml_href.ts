/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DependencyList } from 'react';

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { MlLocatorDefinition } from './ml_locator';
import type { MlLocatorParams } from './types';

function useKibanaShareService() {
  const {
    services: { share },
  } = useKibana<{
    share: SharePluginStart;
  }>();

  if (!share) {
    throw new Error('Kibana share service not available.');
  }

  return share;
}

/**
 * Provides a URL to ML plugin page
 * TODO remove basePath parameter
 */
export const useMlHref = (
  basePath: string | undefined,
  params: MlLocatorParams,
  dependencies?: DependencyList
) => {
  const share = useKibanaShareService();

  const mlLocator = useMemo(
    () => share.url.locators.create(new MlLocatorDefinition()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return mlLocator
    ? mlLocator.useUrl(params, undefined, dependencies)
    : basePath !== undefined
    ? `${basePath}/app/ml/${params.page}`
    : '';
};
