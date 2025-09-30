/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { useOnechatServices } from './use_onechat_service';
import { useKibana } from './use_kibana';

export const useKibanaUrl = () => {
  const {
    startDependencies: { cloud },
  } = useOnechatServices();
  const {
    services: { http },
  } = useKibana();

  const kibanaUrl = useMemo(() => {
    return http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);
  }, [cloud, http]);
  return { kibanaUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  return `${window.location.origin}${http.basePath.get()}`;
}
