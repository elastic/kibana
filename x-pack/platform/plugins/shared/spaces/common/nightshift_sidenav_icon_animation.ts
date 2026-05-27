/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hover-only motion for the Nightshift side-nav icon (moon drift + star twinkle).
 * Injected once; toggled via `data-nightshift-nav-hover` on the nav link.
 */
export const NIGHTSHIFT_SIDENAV_ICON_ANIMATION_CSS = `
  @keyframes nightshift-nav-moon-drift {
    0%, 100% {
      transform: translate(0, 0) rotate(0deg);
    }
    40% {
      transform: translate(0, -0.65px) rotate(-5deg);
    }
    70% {
      transform: translate(0.25px, 0.15px) rotate(4deg);
    }
  }

  @keyframes nightshift-nav-star-twinkle {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0;
      transform: scale(0.45);
    }
  }

  .nightshift-nav-icon__moon,
  .nightshift-nav-icon__star {
    transform-box: fill-box;
    transform-origin: center;
  }

  a[data-nightshift-nav-hover] .nightshift-nav-icon__moon {
    animation: nightshift-nav-moon-drift 2.8s ease-in-out infinite;
  }

  a[data-nightshift-nav-hover] .nightshift-nav-icon__star--1 {
    animation: nightshift-nav-star-twinkle 1.15s ease-in-out infinite;
  }

  a[data-nightshift-nav-hover] .nightshift-nav-icon__star--2 {
    animation: nightshift-nav-star-twinkle 1.15s ease-in-out infinite;
    animation-delay: 0.35s;
  }

  @media (prefers-reduced-motion: reduce) {
    a[data-nightshift-nav-hover] .nightshift-nav-icon__moon,
    a[data-nightshift-nav-hover] .nightshift-nav-icon__star {
      animation: none;
    }
  }
`;
