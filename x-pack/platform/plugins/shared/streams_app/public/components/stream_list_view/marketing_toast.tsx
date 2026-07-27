/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPortal,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';

interface StreamsMarketingToastProps {
  /** Called when the user dismisses the toast (close button). */
  onClose: () => void;
  /** Link the "Explore streams" CTA points at (the interactive canvas tab). */
  exploreHref?: string;
  /** Whether the bottom prototype callout banner is showing, so we can sit above it. */
  isCalloutVisible?: boolean;
}

// The illustration is laid out on the design's own 288x64 grid (the toast's 336px
// width minus its 24px horizontal padding), so every coordinate below matches the
// Figma node 1:1. Connector routes are the exported vector paths, re-authored
// inline so they can animate and pick up the active theme's colors.
const PATHS = {
  top: 'M34.65 7.86 H111.57 A8 8 0 0 1 119.57 15.86 V19 A8 8 0 0 0 127.57 27 H146',
  middle: 'M34 31.5 H146',
  bottom: 'M34.65 56.47 H111.56 A8 8 0 0 0 119.57 48.47 V44 A8 8 0 0 1 127.57 36 H146',
  output: 'M162 31.5 H237.34',
} as const;

const FOLDER_PATH =
  'M2 0.5H6.50879C7.0464 0.5 7.53985 0.787597 7.80664 1.24805L7.85742 1.34277L9.08691 3.8623L9.22363 4.14355H23C23.8282 4.14382 24.4999 4.81548 24.5 5.64355V18L24.4922 18.1533C24.4154 18.9094 23.7766 19.4998 23 19.5H2C1.17157 19.5 0.500001 18.8284 0.5 18V2C0.5 1.22334 1.09028 0.58461 1.84668 0.507812L2 0.5Z';

const enterAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// One full dash period is 4px (dasharray "2 2"); shift by two periods per cycle.
const dashFlow = keyframes`
  to {
    stroke-dashoffset: -8;
  }
`;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  return reduced;
}

/** A single travelling "data packet" that drifts along a connector path. */
function DataPacket({
  path,
  begin,
  dur,
  color,
}: {
  path: string;
  begin: string;
  dur: string;
  color: string;
}) {
  return (
    <circle r="2" fill={color}>
      <animateMotion
        dur={dur}
        begin={begin}
        repeatCount="indefinite"
        calcMode="linear"
        rotate="0"
        path={path}
      />
    </circle>
  );
}

function ToastIllustration() {
  const { euiTheme } = useEuiTheme();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Every stroke in the illustration uses the "disabled" text color, per the design.
  const stroke = euiTheme.colors.textDisabled;
  const packetColor = euiTheme.colors.backgroundFilledSuccess;

  const connectorsClassName = css`
    fill: none;
    stroke: ${stroke};
    stroke-width: 1;
    stroke-dasharray: 2 2;
    ${!prefersReducedMotion &&
    css`
      animation: ${dashFlow} 2s linear infinite;
    `}
  `;

  return (
    <svg
      viewBox="0 0 288 64"
      width="100%"
      height={64}
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      {/* Dashed connectors: three sources converge on the router, then out to the folder */}
      <g className={connectorsClassName}>
        <path d={PATHS.top} />
        <path d={PATHS.middle} />
        <path d={PATHS.bottom} />
        <path d={PATHS.output} />
      </g>

      <g fill="none" stroke={stroke} strokeWidth={1}>
        {/* Source nodes */}
        <rect x={18.5} y={0.5} width={15} height={15} rx={3.5} />
        <rect x={18.5} y={24.5} width={15} height={15} rx={3.5} />
        <rect x={18.5} y={48.5} width={15} height={15} rx={3.5} />

        {/* Router node */}
        <rect x={146.5} y={23.5} width={15} height={15} rx={3.5} />
        <circle cx={154} cy={31} r={3.5} />

        {/* Destination folder */}
        <g transform="translate(237,20)">
          <path d={FOLDER_PATH} />
        </g>
      </g>

      {/* Travelling data packets, or the design's static dots under reduced motion */}
      {prefersReducedMotion ? (
        <g fill={packetColor}>
          <circle cx={61} cy={8} r={2} />
          <circle cx={81} cy={32} r={2} />
          <circle cx={61} cy={57} r={2} />
        </g>
      ) : (
        <>
          <DataPacket path={PATHS.top} begin="0s" dur="4.5s" color={packetColor} />
          <DataPacket path={PATHS.middle} begin="-1.5s" dur="4.5s" color={packetColor} />
          <DataPacket path={PATHS.bottom} begin="-3s" dur="4.5s" color={packetColor} />
          <DataPacket path={PATHS.output} begin="-1s" dur="3.6s" color={packetColor} />
          <DataPacket path={PATHS.output} begin="-2.8s" dur="3.6s" color={packetColor} />
        </>
      )}
    </svg>
  );
}

/**
 * A "marketing" toast shown when a user lands on the Streams app. It sits
 * bottom-right like a regular EUI toast and features an animated illustration of
 * data flowing from source nodes, through routing, into a destination.
 */
export function StreamsMarketingToast({
  onClose,
  exploreHref,
  isCalloutVisible = false,
}: StreamsMarketingToastProps) {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('l');

  const badgeLabel = i18n.translate('xpack.streams.streamsListView.marketingToast.badgeLabel', {
    defaultMessage: 'Technical preview',
  });
  const closeLabel = i18n.translate('xpack.streams.streamsListView.marketingToast.closeLabel', {
    defaultMessage: 'Dismiss',
  });
  const title = i18n.translate('xpack.streams.streamsListView.marketingToast.title', {
    defaultMessage: 'Streams: Your data topology, visualized',
  });
  const description = i18n.translate('xpack.streams.streamsListView.marketingToast.description', {
    defaultMessage:
      'Connect sources, shape data, route it anywhere, and inspect the full flow as an interactive graph.',
  });
  const exploreLabel = i18n.translate('xpack.streams.streamsListView.marketingToast.exploreLabel', {
    defaultMessage: 'Explore streams',
  });

  return (
    <EuiPortal>
      <div
        role="dialog"
        aria-label={title}
        data-test-subj="streamsMarketingToast"
        className={css`
          position: fixed;
          right: ${euiTheme.size.base};
          bottom: ${isCalloutVisible ? 60 : 24}px;
          z-index: 1000;
          width: 336px;
          max-width: calc(100vw - ${euiTheme.size.xl});
          box-sizing: border-box;
          overflow: hidden;
          border-radius: ${euiTheme.border.radius.small};
          background-color: ${euiTheme.colors.backgroundBasePlain};
          ${shadow}
          animation: ${enterAnimation} 0.32s cubic-bezier(0.34, 1.2, 0.64, 1) both;
        `}
      >
        {/* Top: badge + close, then the illustration, over a subtle primary-tinted gradient */}
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.base};
            padding: ${euiTheme.size.base} ${euiTheme.size.l};
            background: linear-gradient(
              to top,
              ${euiTheme.colors.backgroundBasePlain} 24.5%,
              ${euiTheme.colors.backgroundBasePrimary} 100%
            );
          `}
        >
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: ${euiTheme.size.s};
            `}
          >
            <EuiBadge color="primary" iconType="flask">
              {badgeLabel}
            </EuiBadge>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              display="empty"
              size="xs"
              aria-label={closeLabel}
              onClick={onClose}
              data-test-subj="streamsMarketingToastClose"
            />
          </div>
          <ToastIllustration />
        </div>

        {/* Bottom: copy + actions */}
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.l};
            padding: ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
            background-color: ${euiTheme.colors.backgroundBasePlain};
          `}
        >
          <div
            className={css`
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.xxs};
              word-break: break-word;
            `}
          >
            <h2
              className={css`
                margin: 0;
                color: ${euiTheme.colors.textHeading};
                font-size: 14px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: 20px;
              `}
            >
              {title}
            </h2>
            <p
              className={css`
                margin: 0;
                color: ${euiTheme.colors.textSubdued};
                font-size: 12px;
                font-weight: ${euiTheme.font.weight.regular};
                line-height: 16px;
              `}
            >
              {description}
            </p>
          </div>

          <div
            className={css`
              display: flex;
              gap: ${euiTheme.size.s};
            `}
          >
            <EuiButtonEmpty
              href={exploreHref}
              onClick={onClose}
              size="xs"
              color="text"
              data-test-subj="streamsMarketingToastExplore"
              className={css`
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
                border-radius: ${euiTheme.border.radius.small};
              `}
            >
              {exploreLabel}
            </EuiButtonEmpty>
          </div>
        </div>
      </div>
    </EuiPortal>
  );
}
