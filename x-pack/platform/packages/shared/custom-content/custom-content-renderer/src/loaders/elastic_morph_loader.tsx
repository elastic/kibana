/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MORPH_DOT_COUNT,
  MORPH_DOT_RADIUS,
  MORPH_DOTS,
  MORPH_PIECES,
  MORPH_RENDER_SIZE,
  MORPH_TWINKLE_DENSITY,
} from './dot_morph_geometry';

const morphStyles = css`
  path {
    transform-box: fill-box;
    transform-origin: center;
  }

  &[data-state='thinking'] path:nth-of-type(1) {
    scale: 0.432;
    opacity: 0;
  }
  &[data-state='thinking'] path:nth-of-type(2) {
    scale: 0.664;
    opacity: 0;
  }
  &[data-state='thinking'] path:nth-of-type(3) {
    scale: 0.441;
    opacity: 0;
  }
  &[data-state='thinking'] path:nth-of-type(4) {
    scale: 0.662;
    opacity: 0;
  }
  &[data-state='thinking'] path:nth-of-type(5) {
    scale: 0.289;
    opacity: 0;
  }
  &[data-state='thinking'] path:nth-of-type(6) {
    scale: 0.296;
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    path {
      transition: scale var(--speed-slow) var(--ease-bounce) var(--speed-slow),
        opacity var(--speed-extra-fast) linear var(--speed-slow);
    }
    &[data-state='thinking'] path {
      transition: scale var(--speed-normal) var(--ease-resistance),
        opacity var(--speed-extra-fast) linear var(--speed-fast);
    }
  }
`;

const dotStyles = css`
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  pointer-events: none;

  circle {
    fill: var(--motion-morph-rest);
    transform-box: fill-box;
    transform-origin: center;
    scale: 0;
    opacity: 0;
  }

  [data-state='thinking'] & circle {
    scale: 1;
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    circle {
      transition: scale var(--speed-fast) var(--ease-resistance) var(--dout, 0ms),
        opacity var(--speed-fast) linear calc(var(--dout, 0ms) + var(--speed-extra-fast)),
        fill var(--speed-normal) linear;
    }
    [data-state='thinking'] & circle {
      transition: scale var(--speed-normal) var(--ease-bounce) var(--din, 0ms),
        opacity var(--speed-extra-fast) linear var(--din, 0ms),
        fill var(--speed-slow) var(--ease-resistance);
    }
    [data-state='thinking'] & circle[data-lit='true'] {
      transition: scale var(--speed-normal) var(--ease-bounce) var(--din, 0ms),
        opacity var(--speed-extra-fast) linear var(--din, 0ms),
        fill var(--speed-fast) var(--ease-resistance);
    }
  }

  circle[data-leaf='true'] {
    fill: var(--pc);
    scale: 0.6;
    translate: var(--dx) var(--dy);
  }

  [data-state='thinking'] & circle[data-leaf='true'] {
    fill: var(--motion-morph-rest);
    scale: 1;
    translate: 0 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    circle[data-leaf='true'] {
      transition: translate var(--speed-normal) var(--ease-resistance) var(--speed-extra-fast),
        scale var(--speed-fast) var(--ease-resistance) var(--speed-extra-slow),
        opacity var(--speed-extra-fast) linear var(--speed-extra-slow),
        fill var(--speed-normal) linear;
    }
    [data-state='thinking'] & circle[data-leaf='true'] {
      transition: translate var(--speed-slow) var(--ease-resistance)
          calc(var(--speed-normal) + var(--pk) * var(--speed-extra-fast) / 6),
        scale var(--speed-fast) var(--ease-resistance) var(--speed-extra-fast),
        opacity var(--speed-extra-fast) linear var(--speed-fast),
        fill var(--speed-slow) var(--ease-resistance);
    }
    [data-state='thinking'] & circle[data-leaf='true'][data-lit='true'] {
      transition: translate var(--speed-slow) var(--ease-resistance)
          calc(var(--speed-normal) + var(--pk) * var(--speed-extra-fast) / 6),
        scale var(--speed-fast) var(--ease-resistance) var(--speed-extra-fast),
        opacity var(--speed-extra-fast) linear var(--speed-fast),
        fill var(--speed-fast) var(--ease-resistance);
    }
  }
`;

const mixColors = (from: string, to: string, amount: number): string => {
  const channels = (hex: string): [number, number, number] => {
    const value = parseInt(hex.slice(1), 16);
    return [Math.floor(value / 65536) % 256, Math.floor(value / 256) % 256, value % 256];
  };
  const start = channels(from);
  const end = channels(to);
  return `#${start
    .map((channel, index) =>
      Math.round(channel + (end[index] - channel) * amount)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
};

const asHex = (color: string): string => (/^#[0-9a-f]{6}$/i.test(color) ? color : '#D3DAE6');

const tokenMs = (token: string): number => parseFloat(token);

export interface ElasticMorphLoaderProps {
  /** Width and height of the logo once the dots have gathered. */
  size?: number;
  /** Width and height of the dot grid while a response is generating. */
  loadingSize?: number;
  /** `true` shows the dot grid. `false` gathers the dots into the logo. */
  isLoading?: boolean;
  /** Names the progress indicator. Omit when `decorative` is set. */
  label?: string;
  /** Hides the graphic from assistive tech. */
  decorative?: boolean;
  /** Called once the dots have gathered back into the logo. */
  onSettled?: () => void;
}

/**
 * A dot grid while a response is generating, gathering into the Elastic logo when it finishes.
 * Drawn for the Elastic AI Agent.
 */
export const ElasticMorphLoader: React.FC<ElasticMorphLoaderProps> = ({
  size = 24,
  loadingSize,
  isLoading = true,
  label,
  decorative = false,
  onSettled,
}) => {
  const { euiTheme } = useEuiTheme();
  const restColor = asHex(euiTheme.colors.borderBasePlain);
  const { animation } = euiTheme;
  const slowMs = tokenMs(animation.slow);
  const fastMs = tokenMs(animation.fast);
  const extraFastMs = tokenMs(animation.extraFast);
  // Covers the reference exit: the logo waits out `slow`, then scales for `slow`.
  const exitMs = tokenMs(animation.extraSlow) + slowMs;
  const isThinking = isLoading;
  const [lit, setLit] = useState<Record<number, string>>({});
  const wasLoadingRef = useRef(isLoading);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }
    if (!wasLoadingRef.current) {
      return;
    }
    wasLoadingRef.current = false;
    const settledTimer = setTimeout(() => onSettledRef.current?.(), exitMs);
    return () => clearTimeout(settledTimer);
  }, [exitMs, isLoading]);

  useEffect(() => {
    if (!isThinking) {
      setLit({});
      return;
    }
    const slowDown = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1.6 : 1;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };
    const current: Record<number, string> = {};
    const recent: number[] = [];
    const commit = () => setLit({ ...current });
    const release = (cell: number) => {
      delete current[cell];
      commit();
    };
    const pickColor = () => {
      const brand = MORPH_PIECES[Math.floor(Math.random() * MORPH_PIECES.length)].color;
      const roll = Math.random();
      return mixColors(restColor, brand, roll < 0.35 ? 1 : roll < 0.75 ? 0.72 : 0.45);
    };

    const tick = () => {
      const roll = Math.random();
      const picks = roll < 0.12 ? 0 : roll < 0.82 ? 1 : 2;
      for (let pick = 0; pick < picks; pick++) {
        const free: number[] = [];
        for (let cell = 0; cell < MORPH_DOT_COUNT; cell++) {
          if (current[cell] == null && !recent.includes(cell)) {
            free.push(cell);
          }
        }
        if (!free.length) {
          break;
        }
        const cell = free[Math.floor(Math.random() * free.length)];
        current[cell] = pickColor();
        recent.push(cell);
        if (recent.length > 4 * MORPH_TWINKLE_DENSITY) {
          recent.shift();
        }
        later(() => release(cell), slowMs + Math.random() * fastMs);
      }
      commit();
      later(tick, extraFastMs * slowDown * (0.7 + Math.random() * 0.6));
    };
    later(tick, 0);

    return () => timers.forEach(clearTimeout);
  }, [extraFastMs, fastMs, isThinking, restColor, slowMs]);

  const progress = !decorative && isLoading;
  const state = isThinking ? 'thinking' : 'idle';
  const gridSize = loadingSize ?? size;
  const logoScale = size / MORPH_RENDER_SIZE;
  const gridScale = gridSize / MORPH_RENDER_SIZE;

  return (
    <span
      data-test-subj="elasticMorphLoader"
      data-state={state}
      data-size={isThinking ? gridSize : size}
      css={css`
        position: relative;
        display: block;
        flex-shrink: 0;
        line-height: 0;
        inline-size: ${size}px;
        block-size: ${size}px;
      `}
      role={progress ? 'progressbar' : undefined}
      aria-label={progress ? label : undefined}
      aria-hidden={progress ? undefined : true}
    >
      {/* Drawn at 32px, where one viewBox unit is one pixel, then scaled from the center of the slot. */}
      <span
        data-state={state}
        css={[
          morphStyles,
          css`
            position: absolute;
            inset-inline-start: 50%;
            inset-block-start: 50%;
            inline-size: ${MORPH_RENDER_SIZE}px;
            block-size: ${MORPH_RENDER_SIZE}px;
            margin-inline-start: -${MORPH_RENDER_SIZE / 2}px;
            margin-block-start: -${MORPH_RENDER_SIZE / 2}px;
            transform: scale(${logoScale});
            transform-origin: center;

            @media (prefers-reduced-motion: no-preference) {
              transition: transform var(--speed-slow) var(--ease-bounce) var(--speed-slow);
            }

            &[data-state='thinking'] {
              transform: scale(${gridScale});
            }
          `,
        ]}
        style={
          {
            '--speed-extra-fast': animation.extraFast,
            '--speed-fast': animation.fast,
            '--speed-normal': animation.normal,
            '--speed-slow': animation.slow,
            '--speed-extra-slow': animation.extraSlow,
            '--ease-bounce': animation.bounce,
            '--ease-resistance': animation.resistance,
            '--motion-morph-rest': restColor,
          } as CSSProperties
        }
      >
        <EuiIcon
          type="logoElastic"
          size="xl"
          aria-hidden={true}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />
        <svg css={dotStyles} viewBox="0 0 32 32" aria-hidden={true} focusable="false">
          {MORPH_DOTS.map((dot) => (
            <circle
              key={dot.cell}
              cx={dot.cx}
              cy={dot.cy}
              r={MORPH_DOT_RADIUS}
              data-leaf={dot.isLeaf ? 'true' : undefined}
              data-lit={lit[dot.cell] ? 'true' : undefined}
              style={
                (lit[dot.cell] ? { ...dot.vars, fill: lit[dot.cell] } : dot.vars) as CSSProperties
              }
            />
          ))}
        </svg>
      </span>
    </span>
  );
};
