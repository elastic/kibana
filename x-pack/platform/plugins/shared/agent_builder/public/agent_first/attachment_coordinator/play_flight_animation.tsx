/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

const FLIGHT_DURATION_MS = 600;
const FLIGHT_MIN_SCALE = 0.65;
const FLIGHT_MAX_SCALE = 1;
const FLIGHT_MAX_ROTATION_DEG = -45;
const FLIGHT_ARC_HEIGHT_MIN_PX = 24;
const FLIGHT_ARC_HEIGHT_RATIO = 0.1;
const FLIGHT_ARC_VIEWPORT_TOP_MARGIN_PX = 8;

interface FlightAnimationOptions {
  fromRect: DOMRect;
  toRect: DOMRect;
  iconType: IconType;
}

interface Point {
  x: number;
  y: number;
}

const easeOutQuad = (t: number): number => 1 - (1 - t) ** 2;

const getQuadraticBezierPoint = (t: number, start: Point, control: Point, end: Point): Point => {
  const inverseT = 1 - t;

  return {
    x: inverseT * inverseT * start.x + 2 * inverseT * t * control.x + t * t * end.x,
    y: inverseT * inverseT * start.y + 2 * inverseT * t * control.y + t * t * end.y,
  };
};

const getScaleAlongPath = (pathProgress: number): number => {
  const scaleBump = 4 * pathProgress * (1 - pathProgress);

  return FLIGHT_MIN_SCALE + (FLIGHT_MAX_SCALE - FLIGHT_MIN_SCALE) * scaleBump;
};

const getRotationAlongPath = (pathProgress: number): number => {
  const rotationBump = 4 * pathProgress * (1 - pathProgress);

  return FLIGHT_MAX_ROTATION_DEG * rotationBump;
};

const getDocumentColorMode = (): 'LIGHT' | 'DARK' => {
  const colorScheme = getComputedStyle(document.body).colorScheme;

  return colorScheme === 'dark' ? 'DARK' : 'LIGHT';
};

const FlightAnimatedIcon: React.FC<{ iconType: IconType }> = ({ iconType }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: euiTheme.size.xs,
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        boxShadow: euiTheme.shadows.s.down,
      })}
      data-test-subj="agentBuilderAttachmentFlightBadge"
    >
      <EuiIcon type={iconType} size="m" color="text" aria-hidden />
    </div>
  );
};

export const playFlightAnimation = ({
  fromRect,
  toRect,
  iconType,
}: FlightAnimationOptions): Promise<void> => {
  return new Promise((resolve) => {
    const start: Point = {
      x: fromRect.left + fromRect.width / 2,
      y: fromRect.top + fromRect.height / 2,
    };
    const end: Point = {
      x: toRect.left + toRect.width / 2,
      y: toRect.top + toRect.height / 2,
    };

    const horizontalDistance = Math.abs(end.x - start.x);
    const baselineY = Math.min(start.y, end.y);
    const desiredArcHeight = Math.max(
      FLIGHT_ARC_HEIGHT_MIN_PX,
      horizontalDistance * FLIGHT_ARC_HEIGHT_RATIO
    );
    const maxArcHeight = Math.max(0, baselineY - FLIGHT_ARC_VIEWPORT_TOP_MARGIN_PX);
    const arcHeight = Math.min(desiredArcHeight, maxArcHeight);
    const control: Point = {
      x: (start.x + end.x) / 2,
      y: baselineY - arcHeight,
    };

    const motionWrapper = document.createElement('div');
    motionWrapper.style.position = 'fixed';
    motionWrapper.style.left = `${start.x}px`;
    motionWrapper.style.top = `${start.y}px`;
    motionWrapper.style.transform = `translate(-50%, -50%) rotate(0deg) scale(${FLIGHT_MIN_SCALE})`;
    motionWrapper.style.opacity = '1';
    motionWrapper.style.pointerEvents = 'none';
    motionWrapper.style.zIndex = '10000';
    document.body.appendChild(motionWrapper);

    let root: Root | undefined;
    try {
      root = createRoot(motionWrapper);
      root.render(
        <EuiThemeProvider colorMode={getDocumentColorMode()}>
          <FlightAnimatedIcon iconType={iconType} />
        </EuiThemeProvider>
      );
    } catch {
      motionWrapper.remove();
      resolve();
      return;
    }

    const cleanup = () => {
      root?.unmount();
      motionWrapper.remove();
      resolve();
    };

    let animationStart: number | undefined;

    const animate = (timestamp: number) => {
      if (animationStart === undefined) {
        animationStart = timestamp;
      }

      const elapsed = timestamp - animationStart;
      const linearProgress = Math.min(elapsed / FLIGHT_DURATION_MS, 1);
      const easedProgress = easeOutQuad(linearProgress);
      const { x, y } = getQuadraticBezierPoint(easedProgress, start, control, end);
      const scale = getScaleAlongPath(linearProgress);
      const rotation = getRotationAlongPath(linearProgress);
      const opacity = 1 - easedProgress * 0.15;

      motionWrapper.style.left = `${x}px`;
      motionWrapper.style.top = `${y}px`;
      motionWrapper.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
      motionWrapper.style.opacity = `${opacity}`;

      if (linearProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        cleanup();
      }
    };

    requestAnimationFrame(animate);
  });
};
