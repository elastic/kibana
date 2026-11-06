/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const ANGLE_PROPERTY = '--notebook-running-border-angle';
const REVOLUTION_MS = 1500;

/** Whether the running border animates; when it doesn't, the static status border shows instead. */
export const canAnimateRunningBorder = (): boolean =>
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  'registerProperty' in CSS &&
  typeof Element.prototype.animate === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let isAngleRegistered = false;
const registerAngleProperty = () => {
  if (isAngleRegistered) return;
  isAngleRegistered = true;
  try {
    CSS.registerProperty({
      name: ANGLE_PROPERTY,
      syntax: '<angle>',
      inherits: false,
      initialValue: '0deg',
    });
  } catch {
    // Registering twice throws (e.g. after a hot reload); the existing registration is the same.
  }
};

/**
 * An arc that sweeps around the cell's border while `isRunning`. Once the run ends it completes
 * the current revolution, so even a quick run shows one full turn.
 */
export const RunningBorder = ({ isRunning }: { isRunning: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation>();

  useEffect(() => {
    const element = ref.current;
    if (!element || !canAnimateRunningBorder()) return;
    const current = animation.current;

    if (isRunning) {
      if (current) {
        current.effect?.updateTiming({ iterations: Infinity });
        return;
      }
      registerAngleProperty();
      const next = element.animate(
        [
          { [ANGLE_PROPERTY]: '0deg', opacity: 1 },
          { [ANGLE_PROPERTY]: '360deg', opacity: 1 },
        ],
        { duration: REVOLUTION_MS, iterations: Infinity, easing: 'linear' }
      );
      next.onfinish = () => {
        if (animation.current === next) animation.current = undefined;
      };
      animation.current = next;
      return;
    }

    if (!current) return;
    const elapsed = Number(current.currentTime ?? 0);
    current.effect?.updateTiming({
      iterations: Math.max(1, Math.ceil(elapsed / REVOLUTION_MS)),
    });
  }, [isRunning]);

  useEffect(() => () => animation.current?.cancel(), []);

  const ring = 'linear-gradient(#000 0 0)';
  return (
    <div
      ref={ref}
      aria-hidden={true}
      css={css`
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        padding: ${euiTheme.border.width.thick};
        border-radius: ${euiTheme.border.radius.medium};
        background: conic-gradient(
          from var(${ANGLE_PROPERTY}),
          transparent 0turn,
          transparent 0.6turn,
          ${euiTheme.colors.borderStrongPrimary} 1turn
        );
        mask: ${ring} content-box, ${ring};
        mask-composite: exclude;
        -webkit-mask-composite: xor;
      `}
      data-test-subj="notebookCellRunningBorder"
    />
  );
};
