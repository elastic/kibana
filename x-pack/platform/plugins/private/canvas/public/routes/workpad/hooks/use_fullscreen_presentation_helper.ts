/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { WorkpadRoutingContext } from '..';
import { coreServices } from '../../../services/kibana_services';

const fullscreenClass = 'canvas-isFullscreen';

export const useFullscreenPresentationHelper = () => {
  const { isFullscreen } = useContext(WorkpadRoutingContext);
  useEffect(() => {
    const body = document.querySelector('body');
    const bodyClassList = body!.classList;
    const hasFullscreenClass = bodyClassList.contains(fullscreenClass);

    if (isFullscreen && !hasFullscreenClass) {
      coreServices.chrome.setIsVisible(false);
      bodyClassList.add(fullscreenClass);
    } else if (!isFullscreen && hasFullscreenClass) {
      bodyClassList.remove(fullscreenClass);
      coreServices.chrome.setIsVisible(true);
    }
  }, [isFullscreen]);

  // Remove fullscreen when component unmounts
  useEffectOnce(() => () => {
    coreServices.chrome.setIsVisible(true);
    document.querySelector('body')?.classList.remove(fullscreenClass);
  });
};
