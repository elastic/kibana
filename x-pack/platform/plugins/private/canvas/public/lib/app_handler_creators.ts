/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ZOOM_LEVELS, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../common/lib/constants';

export interface Props {
  /**
   * current zoom level of the workpad
   */
  zoomScale: number;
  /**
   * sets the new zoom level
   */
  setZoomScale: (scale: number) => void;
}

// handlers for zooming in and out
export const zoomHandlerCreators = {
  zoomIn:
    ({ zoomScale, setZoomScale }: Props) =>
    (): void => {
      const scaleUp =
        ZOOM_LEVELS.find((zoomLevel: number) => zoomScale < zoomLevel) || MAX_ZOOM_LEVEL;
      setZoomScale(scaleUp);
    },
  zoomOut:
    ({ zoomScale, setZoomScale }: Props) =>
    (): void => {
      const scaleDown =
        ZOOM_LEVELS.slice()
          .reverse()
          .find((zoomLevel: number) => zoomScale > zoomLevel) || MIN_ZOOM_LEVEL;
      setZoomScale(scaleDown);
    },
  resetZoom:
    ({ setZoomScale }: Props) =>
    (): void => {
      setZoomScale(1);
    },
};

export const useZoomHandlers = ({ zoomScale, setZoomScale }: Props) => {
  const zoomIn = useCallback(() => {
    const scaleUp =
      ZOOM_LEVELS.find((zoomLevel: number) => zoomScale < zoomLevel) || MAX_ZOOM_LEVEL;
    setZoomScale(scaleUp);
  }, [zoomScale, setZoomScale]);

  const zoomOut = useCallback(() => {
    const scaleDown =
      ZOOM_LEVELS.slice()
        .reverse()
        .find((zoomLevel: number) => zoomScale > zoomLevel) || MIN_ZOOM_LEVEL;
    setZoomScale(scaleDown);
  }, [zoomScale, setZoomScale]);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
  }, [setZoomScale]);

  return { zoomIn, zoomOut, resetZoom };
};
