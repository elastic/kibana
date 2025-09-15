/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import React from 'react';

export const HIGHLIGHT_ANIMATION_DURATION = 2000;

const borderSpinKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '10%, 60%': {
    opacity: 1,
  },
  '100%': {
    '--highlight-rotate': '180deg',
    opacity: 0,
  },
});

const shineKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '10%': {
    opacity: 0.7,
  },
  '100%': {
    '--highlight-rotate': '180deg',
    opacity: 0,
  },
});

const highlightPropertyStyles = css`
  @property --highlight-rotate {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
`;

/**
 * Creates highlight animation styles for search input components
 * @param euiTheme - EUI theme object
 * @param colorMode - Current color mode (light/dark)
 * @returns CSS styles for the highlight animation
 */
export const getSearchHighlightStyles = (euiTheme: any, colorMode: string) => {
  const rotatingGradient = `
    linear-gradient(var(--highlight-rotate), 
    ${euiTheme.colors.borderBaseSuccess} 0%,
    ${euiTheme.colors.borderBaseAccent} 46%,
    ${euiTheme.colors.borderBaseAccentSecondary} 100%
  )`;

  const brightenInDarkMode = (brightness: number) =>
    colorMode === 'DARK' ? `brightness(${brightness})` : '';

  return css([
    highlightPropertyStyles,
    {
      '&.search-highlighted': {
        position: 'relative',
        overflow: 'visible',
      },
      '&.search-highlighted .euiFormControlLayout': {
        position: 'relative',
        overflow: 'visible !important',
      },
      '&.search-highlighted .euiFormControlLayout::before': {
        content: `""`,
        opacity: 0,
        position: 'absolute',
        left: '-3px',
        top: '-3px',
        right: '-3px',
        bottom: '-3px',
        backgroundImage: rotatingGradient,
        filter: brightenInDarkMode(1.5),
        borderRadius: '6px',
        animation: `${borderSpinKeyframes} ${HIGHLIGHT_ANIMATION_DURATION}ms ease-out`,
        pointerEvents: 'none',
        zIndex: 1,
      },
      '&.search-highlighted .euiFormControlLayout::after': {
        content: `""`,
        opacity: 0,
        position: 'absolute',
        left: '-8px',
        top: '-8px',
        right: '-8px',
        bottom: '-8px',
        backgroundImage: rotatingGradient,
        filter: `${brightenInDarkMode(1.3)} blur(15px)`,
        animation: `${shineKeyframes} ${HIGHLIGHT_ANIMATION_DURATION}ms ease-out`,
        pointerEvents: 'none',
        zIndex: 0,
      },
      '&.search-highlighted .euiFormControlLayout .euiFormControlLayout__childrenWrapper': {
        position: 'relative',
        zIndex: 2,
      },
    },
  ]);
};

/**
 * Hook for managing highlight animation state
 * @param isEnabled - Whether the highlight animation should be enabled
 * @returns Object with highlight state and trigger function
 */
export const useHighlightAnimation = (isEnabled: boolean = true) => {
  const [isHighlighted, setIsHighlighted] = React.useState(false);
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerHighlight = React.useCallback(() => {
    if (!isEnabled) return;

    console.log('🔍 Triggering search highlight animation');
    setIsHighlighted(true);
    
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    
    highlightTimeoutRef.current = setTimeout(() => {
      console.log('🔍 Removing search highlight animation');
      setIsHighlighted(false);
    }, HIGHLIGHT_ANIMATION_DURATION);
  }, [isEnabled]);

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    isHighlighted,
    triggerHighlight,
  };
};
