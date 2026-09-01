/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFocusTrap,
  EuiOverlayMask,
  EuiScreenReaderOnly,
  euiCanAnimate,
  type UseEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

const DOT_TILE_PX = 16;

// Drift the dot grid by exactly one tile so the loop is seamless; each corner sets its
// own direction through --dot-drift, making the dots circle the viewport clockwise.
const dotDrift = keyframes({
  from: { backgroundPosition: '0 0' },
  to: { backgroundPosition: 'var(--dot-drift)' },
});

const cornerStyles = {
  topLeft: css({
    top: 0,
    left: 0,
    maskImage: 'radial-gradient(circle at top left, black, transparent 72%)',
    '--dot-drift': `${DOT_TILE_PX}px 0`,
  }),
  topRight: css({
    top: 0,
    right: 0,
    maskImage: 'radial-gradient(circle at top right, black, transparent 72%)',
    '--dot-drift': `0 ${DOT_TILE_PX}px`,
  }),
  bottomRight: css({
    bottom: 0,
    right: 0,
    maskImage: 'radial-gradient(circle at bottom right, black, transparent 72%)',
    '--dot-drift': `-${DOT_TILE_PX}px 0`,
  }),
  bottomLeft: css({
    bottom: 0,
    left: 0,
    maskImage: 'radial-gradient(circle at bottom left, black, transparent 72%)',
    '--dot-drift': `0 -${DOT_TILE_PX}px`,
  }),
};

const overlayStyles = {
  dots: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      width: 'min(40vmin, 420px)',
      height: 'min(40vmin, 420px)',
      pointerEvents: 'none',
      opacity: 0.8,
      backgroundImage: `radial-gradient(circle, ${euiTheme.colors.primary} 2px, transparent 2px)`,
      backgroundSize: `${DOT_TILE_PX}px ${DOT_TILE_PX}px`,
      [euiCanAnimate]: {
        animation: `${dotDrift} 2s linear infinite`,
      },
    }),
};

const ScreenshotOverlay = () => {
  const styles = useMemoCss(overlayStyles);

  return (
    <EuiFocusTrap>
      {(Object.keys(cornerStyles) as Array<keyof typeof cornerStyles>).map((corner) => (
        <div key={corner} aria-hidden="true" css={[styles.dots, cornerStyles[corner]]} />
      ))}
      <EuiScreenReaderOnly>
        <p role="status">
          {i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.screenshotOverlayLabel', {
            defaultMessage: 'Capturing a dashboard screenshot…',
          })}
        </p>
      </EuiScreenReaderOnly>
    </EuiFocusTrap>
  );
};

// The capture temporarily mutates the dashboard (e.g. expands collapsed sections), so block
// interaction until the original layout is restored. Returns a function that hides the overlay.
export const showScreenshotOverlay = (rendering: CoreStart['rendering']): (() => void) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const unmount = toMountPoint(
    <EuiOverlayMask data-test-subj="prettifyDashboardScreenshotOverlay">
      <ScreenshotOverlay />
    </EuiOverlayMask>,
    rendering
  )(container);

  return () => {
    unmount();
    container.remove();
  };
};
