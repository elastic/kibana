/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/**
 * Creates overlay backdrop styles for search overlay
 * @param euiTheme - EUI theme object
 * @returns CSS styles for the overlay backdrop
 */
export const getOverlayBackdropStyles = (euiTheme: any) => css({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: Number(euiTheme.levels.modal),
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: euiTheme.size.l,
  paddingTop: '20vh', // Position search higher up for better visual balance
  animation: 'fadeIn 0.2s ease-out',
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
});

/**
 * Creates overlay search container styles
 * @param euiTheme - EUI theme object
 * @param highlightStyles - Highlight animation styles
 * @returns CSS styles for the search container in overlay mode
 */
export const getOverlaySearchStyles = (euiTheme: any, highlightStyles: any) => css([
  {
    width: '100%',
    maxWidth: '600px',
    position: 'relative',
    '.euiFormControlLayout': {
      borderRadius: euiTheme.border.radius.medium,
      boxShadow: '0 6px 36px -4px rgba(69, 90, 100, 0.3), 0 24px 64px -8px rgba(69, 90, 100, 0.3)',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    },
    // Ensure popover appears centered below the search input
    '.euiPopover__panel': {
      marginTop: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.medium,
      boxShadow: '0 6px 36px -4px rgba(69, 90, 100, 0.3), 0 24px 64px -8px rgba(69, 90, 100, 0.3)',
    },
  },
  highlightStyles,
]);
