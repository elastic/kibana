/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { buildInboundEventsUrl } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';

const isUsablePublicBaseUrl = (value: string | undefined): value is string =>
  Boolean(value) && value !== '/';

export const useInboundEventsUrl = (connectorTypeId: string, connectorId: string): string => {
  const { http } = useKibana().services;

  return useMemo(() => {
    const { spaceId } = getSpaceIdFromPath(http.basePath.get(), http.basePath.serverBasePath);
    const serverBasePath = http.basePath.serverBasePath;
    const originBase =
      typeof window !== 'undefined'
        ? `${window.location.origin}${
            serverBasePath && serverBasePath !== '/' ? serverBasePath : ''
          }`
        : '';
    const publicBaseUrl = isUsablePublicBaseUrl(http.basePath.publicBaseUrl)
      ? http.basePath.publicBaseUrl
      : originBase;

    return buildInboundEventsUrl({
      publicBaseUrl,
      spaceId,
      connectorTypeId,
      connectorId,
    });
  }, [http.basePath, connectorTypeId, connectorId]);
};
