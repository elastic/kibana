/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';

/**
 * Subtle one-shot "fade + lift" animation for top-level Agent Builder
 * surfaces (sidebar, chat input, chat messages, new-conversation prompt).
 * Applied via the `animation` CSS shorthand so it plays once when the
 * element mounts and then leaves the element at its final opacity /
 * transform (the `both` fill-mode).
 *
 * Designed to be cheap and unintrusive: a 4px upward drift over 320 ms
 * with ease-out, paired with `opacity` 0 → 1. The intent is to soften
 * the moment new surfaces appear (e.g. when a deep-link from Nightshift
 * lands on the Agent Builder) without anyone consciously noticing the
 * animation.
 *
 * Respects `prefers-reduced-motion: reduce` by dropping the transform
 * but keeping a plain opacity fade for users who tolerate that.
 */
const fadeInKeyframes = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeInReducedKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * Returns Emotion `css` styles that fade an element in once on mount.
 *
 * @param delayMs Optional millisecond delay before the animation starts
 *   (useful for a light stagger between adjacent surfaces). Defaults to 0.
 * @param withTransform Whether to include the 4px upward lift in addition
 *   to the opacity fade. Defaults to `true`. Pass `false` for tall
 *   container-like surfaces (e.g. the side nav panel) where a translate
 *   reads as the whole panel "growing up" rather than a subtle fade.
 */
export const fadeInOnMount = (delayMs: number = 0, withTransform: boolean = true) => css`
  animation: ${withTransform ? fadeInKeyframes : fadeInReducedKeyframes} 240ms ease-out ${delayMs}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeInReducedKeyframes} 240ms linear ${delayMs}ms both;
  }
`;
