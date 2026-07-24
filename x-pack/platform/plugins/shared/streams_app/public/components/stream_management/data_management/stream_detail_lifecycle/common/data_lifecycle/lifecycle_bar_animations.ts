/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { css, keyframes } from '@emotion/react';
import { euiCanAnimate, type EuiThemeComputed } from '@elastic/eui';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Animates every segment at once when a preview resizes the grid tracks (`fr` units interpolate).
// `ease-in-out` (not a front-loaded curve): switching previews briefly blocks the main thread, so a
// fast-start curve would already look ~done by the first paint and read as a jump.
export const getGridColumnsTransitionCss = (euiTheme: EuiThemeComputed) => css`
  ${euiCanAnimate} {
    transition: grid-template-columns ${euiTheme.animation.normal} ease-in-out;
  }
`;

const countTracks = (gridTemplateColumns: string) => gridTemplateColumns.trim().split(/\s+/).length;

/**
 * Grid transition for live preview edits only. Returns the transition CSS unless:
 *  - `enabled` is false — used to snap the swap into/out of preview (e.g. opening a flyout or the
 *    post-save refresh), which shouldn't animate since the preview and saved models are computed
 *    separately and any tiny width difference would read as a jump; or
 *  - the track count changed — CSS can't interpolate that, so animating it would smear the layout.
 */
export const useGridColumnsTransitionCss = (
  euiTheme: EuiThemeComputed,
  gridTemplateColumns: string,
  enabled: boolean = true
) => {
  const trackCount = countTracks(gridTemplateColumns);
  const prevTrackCountRef = useRef(trackCount);
  const sameTrackCount = prevTrackCountRef.current === trackCount;
  useEffect(() => {
    prevTrackCountRef.current = trackCount;
  }, [trackCount]);
  return enabled && sameTrackCount ? getGridColumnsTransitionCss(euiTheme) : undefined;
};

/** Fades a segment in as it appears, so new segments don't pop into place. Disabled under reduced motion. */
export const getSegmentFadeInCss = (euiTheme: EuiThemeComputed) => css`
  ${euiCanAnimate} {
    animation: ${fadeIn} ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
  }
`;
