/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { css } from '@emotion/react';
import { EuiOverlayMask, EuiFocusTrap, useEuiTheme, keys } from '@elastic/eui';
import { useFullscreen } from './fullscreen_context';

interface FullscreenDisplayProps {
  children: React.ReactNode;
}

export const FullscreenDisplay: React.FC<FullscreenDisplayProps> = ({ children }) => {
  const { isFullscreen, exitFullscreen } = useFullscreen();
  const { euiTheme } = useEuiTheme();

  const fullscreenContainerStyles = css`
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: ${euiTheme.colors.body};
    z-index: ${euiTheme.levels.modal};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  const focusTrapStyles = css`
    width: 100%;
    height: 100%;
  `;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE && isFullscreen) {
        event.preventDefault();
        event.stopPropagation();
        exitFullscreen();
      }
    },
    [isFullscreen, exitFullscreen]
  );

  useEffect(() => {
    if (isFullscreen) {
      // Use capture phase to intercept Escape before input fields can handle it
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isFullscreen, handleKeyDown]);

  if (!isFullscreen) {
    return <>{children}</>;
  }

  return (
    <EuiOverlayMask>
      <EuiFocusTrap clickOutsideDisables={true} css={focusTrapStyles}>
        <div css={fullscreenContainerStyles}>{children}</div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};
