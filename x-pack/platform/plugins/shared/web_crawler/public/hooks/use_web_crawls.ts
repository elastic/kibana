/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { WEB_CRAWLS_PATH, WEB_CRAWL_CANCEL_PATH, WEB_CRAWL_PATH } from '../../common/constants';
import type { WebCrawl, WebCrawlListResponse, WebCrawlStartRequest } from '../../common/types';
import { useWebCrawlerServices } from '../context';
import type { WebCrawlHttpError } from './use_web_crawl';
import {
  WEB_CRAWLS_QUERY_KEY,
  WEB_CRAWL_POLL_INTERVAL_MS,
  getWebCrawlErrorMessage,
} from './use_web_crawl';

const LIST_QUERY_KEY = [...WEB_CRAWLS_QUERY_KEY, 'list'];

const toCrawlPath = (path: string, id: string): string =>
  path.replace('{id}', encodeURIComponent(id));

/** Lists the crawls, running ones and history alike, and starts, stops and deletes them. */
export const useWebCrawls = () => {
  const { http } = useWebCrawlerServices();
  const queryClient = useQueryClient();
  const refreshCrawls = () => queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });

  const {
    data,
    isLoading,
    error: listError,
  } = useQuery<WebCrawlListResponse, WebCrawlHttpError>({
    queryKey: LIST_QUERY_KEY,
    queryFn: () => http.get<WebCrawlListResponse>(WEB_CRAWLS_PATH),
    retry: false,
    refetchInterval: (list) =>
      list?.crawls.some(({ status }) => status === 'running') ? WEB_CRAWL_POLL_INTERVAL_MS : false,
  });

  const start = useMutation<WebCrawl, WebCrawlHttpError, WebCrawlStartRequest>({
    mutationFn: (request) =>
      http.post<WebCrawl>(WEB_CRAWLS_PATH, { body: JSON.stringify(request) }),
    onSuccess: refreshCrawls,
  });

  const stop = useMutation<WebCrawl, WebCrawlHttpError, string>({
    mutationFn: (id) => http.post<WebCrawl>(toCrawlPath(WEB_CRAWL_CANCEL_PATH, id)),
    onSuccess: refreshCrawls,
  });

  const remove = useMutation<void, WebCrawlHttpError, string>({
    mutationFn: (id) => http.delete<void>(toCrawlPath(WEB_CRAWL_PATH, id)),
    onSuccess: refreshCrawls,
  });

  const { mutate: mutateStop, reset: resetStop } = stop;
  const { mutate: mutateRemove, reset: resetRemove } = remove;

  // Only the most recent action's failure is reported.
  const stopCrawl = useCallback(
    (id: string) => {
      resetRemove();
      mutateStop(id);
    },
    [mutateStop, resetRemove]
  );
  const deleteCrawl = useCallback(
    (id: string) => {
      resetStop();
      mutateRemove(id);
    },
    [mutateRemove, resetStop]
  );

  return {
    crawls: data?.crawls ?? [],
    isLoading,
    listErrorMessage: getWebCrawlErrorMessage(listError),
    startCrawl: start.mutate,
    isStarting: start.isLoading,
    startErrorMessage: getWebCrawlErrorMessage(start.error),
    stopCrawl,
    deleteCrawl,
    isActing: stop.isLoading || remove.isLoading,
    actionErrorMessage: getWebCrawlErrorMessage(stop.error ?? remove.error),
  };
};
