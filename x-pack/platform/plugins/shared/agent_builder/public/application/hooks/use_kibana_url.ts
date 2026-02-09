/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { getSpaceIdFromPath, addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

export const useKibanaUrl = () => {
  const {
    startDependencies: { cloud, spaces },
  } = useAgentBuilderServices();
  const {
    services: { http },
  } = useKibana();
  const spaceId = useSpaceId(spaces);

  const kibanaUrl = useMemo(() => {
    const baseUrl = http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);

    const pathname = new URL(baseUrl).pathname;
    const serverBasePath = http.basePath.serverBasePath;
    const { pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

    if (!pathHasExplicitSpaceIdentifier) {
      return addSpaceIdToPath(baseUrl, spaceId);
    }

    return baseUrl;
  }, [cloud, http, spaceId]);

  return { kibanaUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  return `${window.location.origin}${http.basePath.get()}`;
}
