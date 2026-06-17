/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect, useRef } from 'react';
import { WorkpadRoutingContext } from '../workpad_routing_context';

export const useAutoplayHelper = () => {
  const { nextPage, isFullscreen, autoplayInterval, isAutoplayPaused } =
    useContext(WorkpadRoutingContext);
  const timer = useRef<number | undefined>(undefined);
  // Assign during render so the callback always captures the latest nextPage
  // without restarting the timer when only the page count changes.
  const nextPageRef = useRef(nextPage);
  nextPageRef.current = nextPage;

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = undefined;

    if (isFullscreen && !isAutoplayPaused && autoplayInterval > 0) {
      timer.current = window.setTimeout(() => {
        nextPageRef.current();
      }, autoplayInterval);
    }

    return () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [isFullscreen, autoplayInterval, isAutoplayPaused]);
};
