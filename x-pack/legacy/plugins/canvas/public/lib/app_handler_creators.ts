/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ZOOM_LEVELS, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../common/lib/constants';

export interface Props {
  /**
   * current zoom level of the workpad
   */
  zoomScale: number;
  /**
   * zoom level to scale workpad to fit into the viewport
   */
  fitZoomScale: number;
  /**
   * sets the new zoom level
   */
  setZoomScale: (scale: number) => void;
}

// handlers for zooming in and out
export const zoomHandlerCreators = {
  zoomIn: ({ zoomScale, setZoomScale }: Props) => (): void => {
    const scaleIndex = ZOOM_LEVELS.indexOf(zoomScale);
    const scaleUp =
      scaleIndex + 1 < ZOOM_LEVELS.length ? ZOOM_LEVELS[scaleIndex + 1] : MAX_ZOOM_LEVEL;
    setZoomScale(scaleUp);
  },
  zoomOut: ({ zoomScale, setZoomScale }: Props) => (): void => {
    const scaleIndex = ZOOM_LEVELS.indexOf(zoomScale);
    const scaleDown = scaleIndex - 1 >= 0 ? ZOOM_LEVELS[scaleIndex - 1] : MIN_ZOOM_LEVEL;
    setZoomScale(scaleDown);
  },
  resetZoom: ({ setZoomScale }: Props) => (): void => {
    setZoomScale(1);
  },
};
