/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const PULSE_MS = 1200;

/** Whether the running border animates; when it doesn't, the static status border shows instead. */
export const canAnimateRunningBorder = (): boolean =>
  typeof window !== 'undefined' &&
  typeof Element.prototype.animate === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Pulses the cell's border while `isRunning`, and once whenever `runCount` goes up, for runs that
 * finish without ever running. Once a run ends it completes the current pulse, so even a quick run
 * shows one full pulse.
 */
export const RunningBorder = ({
  isRunning,
  runCount,
}: {
  isRunning: boolean;
  runCount?: number;
}) => {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation>();
  const lastRunCount = useRef(runCount);

  const pulse = useCallback((iterations: number) => {
    const element = ref.current;
    if (!element || !canAnimateRunningBorder()) return;
    const current = animation.current;
    if (current) {
      if (iterations === Infinity) current.effect?.updateTiming({ iterations });
      return;
    }
    const next = element.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
      duration: PULSE_MS,
      iterations,
      easing: 'ease-in-out',
    });
    next.onfinish = () => {
      if (animation.current === next) animation.current = undefined;
    };
    animation.current = next;
  }, []);

  useEffect(() => {
    if (isRunning) {
      pulse(Infinity);
      return;
    }
    const current = animation.current;
    if (!current) return;
    const elapsed = Number(current.currentTime ?? 0);
    current.effect?.updateTiming({ iterations: Math.max(1, Math.ceil(elapsed / PULSE_MS)) });
  }, [isRunning, pulse]);

  useEffect(() => {
    const previous = lastRunCount.current;
    lastRunCount.current = runCount;
    if (runCount !== undefined && runCount > (previous ?? 0)) pulse(1);
  }, [runCount, pulse]);

  useEffect(() => () => animation.current?.cancel(), []);

  return (
    <div
      ref={ref}
      aria-hidden={true}
      css={css`
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        border-radius: inherit;
        box-shadow: inset 0 0 0 ${euiTheme.border.width.thick}
          ${euiTheme.colors.borderStrongPrimary};
      `}
      data-test-subj="notebookCellRunningBorder"
    />
  );
};
