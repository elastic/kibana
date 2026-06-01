/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hover-only motion for the Daybreak side-nav icon — slow sun
 * rotation with a subtle breath-style scale (0.9 ↔ 1.1).
 *
 * Modelled after the obs NIGHTSHIFT_SIDENAV_ICON_ANIMATION_CSS for
 * symmetry across the two AI-shift surfaces, and inspired by the
 * Lottie sun reference (lottiefiles.com/animation/sun-animation_3273280):
 * one continuous full rotation, with the scale dipping to 0.9 and
 * peaking at 1.1 over the course of the rotation so the sun reads
 * as "breathing" rather than mechanical.
 *
 * Toggled via data-daybreak-nav-hover on the nav link — attached by
 * attachHoverListeners in daybreak_sidenav_styles.tsx.
 */
export const DAYBREAK_SIDENAV_ICON_ANIMATION_CSS = `
  @keyframes daybreak-nav-sun-pulse {
    0% {
      transform: rotate(0deg) scale(1);
    }
    25% {
      transform: rotate(90deg) scale(1.1);
    }
    50% {
      transform: rotate(180deg) scale(0.9);
    }
    75% {
      transform: rotate(270deg) scale(1.1);
    }
    100% {
      transform: rotate(360deg) scale(1);
    }
  }

  .daybreak-nav-icon__sun {
    transform-box: fill-box;
    transform-origin: center;
  }

  a[data-daybreak-nav-hover] .daybreak-nav-icon__sun {
    animation: daybreak-nav-sun-pulse 3.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    a[data-daybreak-nav-hover] .daybreak-nav-icon__sun {
      animation: none;
    }
  }
`;
