/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState, useEffect } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import { useOnechatServices } from './use_onechat_service';
import { useKibana } from './use_kibana';

export const useKibanaUrl = () => {
  const {
    startDependencies: { cloud, spaces },
  } = useOnechatServices();
  const {
    services: { http },
  } = useKibana();
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const kibanaUrl = useMemo(() => {
    const baseUrl = http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);

    const pathname = new URL(baseUrl).pathname;
    const serverBasePath = http.basePath.serverBasePath;
    const { pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

    // If URL doesn't have a space and we have a non-default space, add it
    if (!pathHasExplicitSpaceIdentifier && spaceId && spaceId !== DEFAULT_SPACE_ID) {
      return `${baseUrl}/s/${spaceId}`;
    }

    return baseUrl;
  }, [cloud, http, spaceId]);

  return { kibanaUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  return `${window.location.origin}${http.basePath.get()}`;
}
