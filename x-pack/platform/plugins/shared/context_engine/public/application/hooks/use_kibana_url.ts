/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { useKibana } from './use_kibana';

export const useKibanaUrl = () => {
  const {
    services: { cloud, http },
  } = useKibana();

  const kibanaUrl = useMemo(() => {
    const baseUrl = http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);
    return addSpaceIdToPath(baseUrl, http.spaceId);
  }, [cloud, http]);

  return { kibanaUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  // serverBasePath, not basePath.get() — caller adds /s/<id> explicitly via addSpaceIdToPath.
  return `${window.location.origin}${http.basePath.serverBasePath}`;
}
