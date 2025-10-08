/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getWorkpad } from '../../../state/selectors/workpad';
import type { WorkpadPageRouteParams, WorkpadRoutingContextType } from '..';
import {
  createTimeInterval,
  isValidTimeInterval,
  getTimeInterval,
} from '../../../lib/time_interval';

export const useRoutingContext: () => WorkpadRoutingContextType = () => {
  const [isAutoplayPaused, setIsAutoplayPaused] = useState<boolean>(false);
  const history = useHistory();
  const { search } = history.location;
  const params = useParams<WorkpadPageRouteParams>();
  const workpad = useSelector(getWorkpad);
  const searchParams = new URLSearchParams(search);
  const parsedPage = parseInt(params.pageNumber!, 10);
  const pageNumber = isNaN(parsedPage) ? workpad.page + 1 : parsedPage;
  const workpadPages = workpad.pages.length;

  const getUrl = useCallback(
    (page: number) => `/workpad/${params.id}/page/${page}${history.location.search}`,
    [params.id, history.location.search]
  );

  const gotoPage = useCallback(
    (page: number) => {
      history.push(getUrl(page));
    },
    [getUrl, history]
  );

  const nextPage = useCallback(() => {
    let newPage = pageNumber + 1;
    if (newPage > workpadPages) {
      newPage = 1;
    }

    gotoPage(newPage);
  }, [pageNumber, workpadPages, gotoPage]);

  const previousPage = useCallback(() => {
    let newPage = pageNumber - 1;
    if (newPage < 1) {
      newPage = workpadPages;
    }

    gotoPage(newPage);
  }, [pageNumber, workpadPages, gotoPage]);

  const isFullscreen = searchParams.get('__fullScreen') === 'true';

  const autoplayValue = searchParams.get('__autoplayInterval');
  const autoplayInterval =
    autoplayValue && isValidTimeInterval(autoplayValue) ? getTimeInterval(autoplayValue) || 0 : 0;

  const refreshValue = searchParams.get('__refreshInterval');
  const refreshInterval =
    refreshValue && isValidTimeInterval(refreshValue) ? getTimeInterval(refreshValue) || 0 : 0;

  const setFullscreen = useCallback(
    (enable: boolean) => {
      const newQuery = new URLSearchParams(history.location.search);

      if (enable) {
        newQuery.set('__fullScreen', 'true');
      } else {
        setIsAutoplayPaused(false);
        newQuery.delete('__fullScreen');
      }

      history.push(`${history.location.pathname}?${newQuery.toString()}`);
    },
    [history, setIsAutoplayPaused]
  );

  const setAutoplayInterval = useCallback(
    (interval: number) => {
      const newQuery = new URLSearchParams(history.location.search);

      if (interval > 0) {
        newQuery.set('__autoplayInterval', createTimeInterval(interval));
      } else {
        newQuery.delete('__autoplayInterval');
      }

      history.push(`${history.location.pathname}?${newQuery.toString()}`);
    },
    [history]
  );

  const setRefreshInterval = useCallback(
    (interval: number) => {
      const newQuery = new URLSearchParams(history.location.search);

      if (interval > 0) {
        newQuery.set('__refreshInterval', createTimeInterval(interval));
      } else {
        newQuery.delete('__refreshInterval');
      }

      history.push(`${history.location.pathname}?${newQuery.toString()}`);
    },
    [history]
  );

  const undo = useCallback(() => {
    history.goBack();
  }, [history]);

  const redo = useCallback(() => {
    history.goForward();
  }, [history]);

  const getRoutingContext = useCallback(
    () => ({
      gotoPage,
      getUrl,
      isFullscreen,
      setFullscreen,
      autoplayInterval,
      setAutoplayInterval,
      nextPage,
      previousPage,
      refreshInterval,
      setRefreshInterval,
      isAutoplayPaused,
      setIsAutoplayPaused,
      undo,
      redo,
    }),
    [
      gotoPage,
      getUrl,
      isFullscreen,
      setFullscreen,
      autoplayInterval,
      setAutoplayInterval,
      nextPage,
      previousPage,
      refreshInterval,
      setRefreshInterval,
      isAutoplayPaused,
      setIsAutoplayPaused,
      undo,
      redo,
    ]
  );

  return useMemo(() => getRoutingContext(), [getRoutingContext]);
};
