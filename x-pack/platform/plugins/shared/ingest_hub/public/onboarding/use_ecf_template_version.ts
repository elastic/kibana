/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import {
  ECF_LATEST_VERSION_API_PATH,
  type GetEcfLatestVersionResponse,
} from '../../common/ecf_version_api';
import { ECF_FALLBACK_TEMPLATE_VERSION } from '../../common/ecf_template_version';

/** Result of `useEcfTemplateVersion`. */
export interface UseEcfTemplateVersionResult {
  /**
   * The resolved ECF template semantic version. Always defined — falls back to
   * `ECF_FALLBACK_TEMPLATE_VERSION` while loading or on error so it can be used
   * immediately as a URL parameter without blocking the launch button.
   */
  version: string;
  /** `remote` | `fallback` from the server, or `undefined` while loading. */
  source: 'remote' | 'fallback' | undefined;
  /** True while the first fetch is in-flight. */
  isLoading: boolean;
}

/**
 * Fetches the latest ECF template semantic version from the Kibana server, which proxies S3
 * (the bucket sends no CORS headers so the browser cannot fetch it directly).
 *
 * The result is cached for the lifetime of the page (`staleTime: Infinity`) — the version
 * changes only on ECF releases, not within a session.
 */
export const useEcfTemplateVersion = (): UseEcfTemplateVersionResult => {
  const { services } = useKibana<CoreStart>();

  const { data, isLoading } = useQuery<GetEcfLatestVersionResponse>({
    queryKey: ['ingest_hub', 'ecf_latest_version'],
    queryFn: () => services.http.get<GetEcfLatestVersionResponse>(ECF_LATEST_VERSION_API_PATH),
    // Version changes only when ECF releases — treat as immutable for the lifetime of the page.
    staleTime: Infinity,
  });

  return {
    version: data?.version ?? ECF_FALLBACK_TEMPLATE_VERSION,
    source: data?.source,
    isLoading,
  };
};
