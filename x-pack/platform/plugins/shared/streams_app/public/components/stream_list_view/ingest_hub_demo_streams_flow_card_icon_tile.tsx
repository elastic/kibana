/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FlowCanvasQualityStatusBadge } from './ingest_hub_demo_streams_flow_card_badge_row';

/** Flow canvas card header: icon glyph size and outer tile (wrapper) in layout px. */
const TILE_ICON_PX = 16;
const TILE_WRAPPER_PX = 32;
const TILE_CORNER_RADIUS_PX = 10;

/**
 * Approximate vertical extent of the quality `EuiBadge` below the icon tile layout box
 * (`inset-block-end` overlay). Used when spacing the stats row so ~12px reads from the badge
 * to the data-type line.
 */
export const FLOW_CARD_QUALITY_BADGE_OVERFLOW_BELOW_ICON_TILE_PX = 8;

const qualityBadgeOverlayCss = css`
  position: absolute;
  inset-inline-end: -5px;
  inset-block-end: -5px;
  z-index: 1;
  line-height: 0;
`;

const iconTileRootCss = css`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
`;

const iconGlyphClipCss = css`
  width: ${TILE_ICON_PX}px;
  height: ${TILE_ICON_PX}px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  /* Logos (e.g. logoAWS) ignore EuiIcon size; cap the rendered asset like other glyphs. */
  svg,
  img {
    width: ${TILE_ICON_PX}px;
    height: ${TILE_ICON_PX}px;
    max-width: 100%;
    max-height: 100%;
    flex-shrink: 0;
  }
`;

export interface IngestHubDemoStreamsFlowCardIconTileProps {
  readonly iconType: IconType;
  /** When set, the good / degraded / poor icon-only badge is overlapped at the tile bottom-right. */
  readonly qualityStatus?: 'good' | 'degraded' | 'poor';
}

export function IngestHubDemoStreamsFlowCardIconTile({
  iconType,
  qualityStatus,
}: IngestHubDemoStreamsFlowCardIconTileProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={iconTileRootCss}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: TILE_WRAPPER_PX,
          height: TILE_WRAPPER_PX,
          borderRadius: TILE_CORNER_RADIUS_PX,
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        }}
      >
        <span css={iconGlyphClipCss}>
          <EuiIcon type={iconType} size="m" title="" aria-hidden />
        </span>
      </div>
      {qualityStatus ? (
        <div css={qualityBadgeOverlayCss}>
          <FlowCanvasQualityStatusBadge status={qualityStatus} />
        </div>
      ) : null}
    </div>
  );
}
