/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { LoaderId, LoaderScenario } from './loader_preference';
import { OrbitRingLoader } from './orbit_ring_loader';
import { PulseDotsLoader } from './pulse_dots_loader';
import { ScanDotsLoader } from './scan_dots_loader';
import { useLoader } from './use_loader';

interface MotionLoaderProps {
  scenario: LoaderScenario;
  /** Draws one loader instead of the scenario's current choice. */
  loaderId?: LoaderId;
  /** Defaults to the small avatar size. */
  size?: string | number;
  /** Names the progress indicator. Omit when `decorative` is set. */
  label?: string;
  /** Hides the graphic from assistive tech, for previews inside a named control. */
  decorative?: boolean;
}

export const MotionLoader: React.FC<MotionLoaderProps> = ({
  scenario,
  loaderId: loaderIdProp,
  size,
  label,
  decorative = false,
}) => {
  const selectedLoaderId = useLoader(scenario);
  const loaderId = loaderIdProp ?? selectedLoaderId;
  const { euiTheme } = useEuiTheme();
  const resolvedSize = size ?? euiTheme.size.l;
  const progressLabel = decorative ? undefined : label;

  const frameStyles = css`
    display: inline-flex;
    flex-shrink: 0;
    line-height: 0;
  `;

  const graphic = (() => {
    switch (loaderId) {
      case 'elastic':
        return <EuiLoadingElastic size={size === 16 ? 'm' : 'l'} aria-label={progressLabel} />;
      case 'orbitRing':
        return <OrbitRingLoader size={resolvedSize} label={progressLabel} />;
      case 'scanDots':
        return <ScanDotsLoader size={resolvedSize} label={progressLabel} />;
      case 'pulseDots':
        return <PulseDotsLoader size={resolvedSize} label={progressLabel} />;
      default: {
        const unhandled: never = loaderId;
        return unhandled;
      }
    }
  })();

  return (
    <span
      data-test-subj="motionLoader"
      data-loader-id={loaderId}
      data-loader-scenario={scenario}
      aria-hidden={decorative ? true : undefined}
      css={frameStyles}
    >
      {graphic}
    </span>
  );
};
