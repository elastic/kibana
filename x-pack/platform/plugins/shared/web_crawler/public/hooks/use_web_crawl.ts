/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { PLUGIN_ID, WEB_CRAWLS_PATH, WEB_CRAWL_PATH } from '../../common/constants';
import type { WebCrawl, WebCrawlStartRequest } from '../../common/types';
import { useWebCrawlerServices, useStorageKey } from '../context';
import { useLocalStorage } from './use_local_storage';

export const WEB_CRAWL_ID_KEY_SUFFIX = 'webCrawl.id';
export const WEB_CRAWL_POLL_INTERVAL_MS = 3000;
export const WEB_CRAWLS_QUERY_KEY = [PLUGIN_ID, 'webCrawls'];

export type WebCrawlHttpError = IHttpFetchError<ResponseErrorBody>;

export const getWebCrawlErrorMessage = (error: WebCrawlHttpError | null): string | undefined =>
  error ? error.body?.message ?? error.message : undefined;

/** Starts a crawl and follows the one most recently started from this browser, across page reloads. */
export const useWebCrawl = () => {
  const { http } = useWebCrawlerServices();
  const queryClient = useQueryClient();
  const getStorageKey = useStorageKey();
  const [crawlId, setCrawlId] = useLocalStorage<string | null>(
    getStorageKey(WEB_CRAWL_ID_KEY_SUFFIX),
    null
  );

  const { data: crawl } = useQuery<WebCrawl, WebCrawlHttpError>({
    queryKey: [...WEB_CRAWLS_QUERY_KEY, crawlId],
    queryFn: () =>
      http.get<WebCrawl>(WEB_CRAWL_PATH.replace('{id}', encodeURIComponent(crawlId ?? ''))),
    enabled: crawlId !== null,
    retry: false,
    refetchInterval: (data) => (data?.status === 'running' ? WEB_CRAWL_POLL_INTERVAL_MS : false),
  });

  const {
    mutate: startCrawl,
    isLoading: isStarting,
    error: startError,
  } = useMutation<WebCrawl, WebCrawlHttpError, WebCrawlStartRequest>({
    mutationFn: (request) =>
      http.post<WebCrawl>(WEB_CRAWLS_PATH, { body: JSON.stringify(request) }),
    onSuccess: (startedCrawl) => {
      queryClient.setQueryData([...WEB_CRAWLS_QUERY_KEY, startedCrawl.id], startedCrawl);
      setCrawlId(startedCrawl.id);
    },
  });

  return {
    crawl,
    startCrawl,
    isStarting,
    startErrorMessage: getWebCrawlErrorMessage(startError),
  };
};
