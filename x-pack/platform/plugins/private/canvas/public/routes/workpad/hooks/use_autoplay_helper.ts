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

  useEffect(() => {
    if (timer.current || !isFullscreen || isAutoplayPaused) {
      clearTimeout(timer.current);
    }

    if (isFullscreen && !isAutoplayPaused && autoplayInterval > 0) {
      timer.current = window.setTimeout(() => {
        nextPage();
      }, autoplayInterval);
    }

    return () => clearTimeout(timer.current);
  }, [isFullscreen, nextPage, autoplayInterval, isAutoplayPaused]);
};
