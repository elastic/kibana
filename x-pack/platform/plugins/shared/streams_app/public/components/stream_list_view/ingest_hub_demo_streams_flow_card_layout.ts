/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';

/** Uniform width for every stream graph card (source, pipeline, routing, destination). */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX = 250;

/** Uniform inner padding on all sides of every stream graph card panel. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_INSET_PX = 12;

/** Icon tile row height — keep in sync with {@link ./ingest_hub_demo_streams_flow_card_icon_tile}. */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_ICON_ROW_HEIGHT_PX = 32;

/**
 * Space between the header row and the metrics / detail line inside the card body.
 * Includes room for the quality badge that overlaps below the icon tile on source/destination cards.
 */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX = 20;

/** Approximate height of the metrics / detail text line (xxs, single line). */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_STATS_LINE_HEIGHT_PX = 16;

/**
 * Uniform card height: inset padding + icon row + header-to-stats gap + one stats line.
 * Quality-badge overflow is accounted for in the header-to-stats gap on source/destination cards.
 */
export const INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX =
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_INSET_PX * 2 +
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_ICON_ROW_HEIGHT_PX +
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX +
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_STATS_LINE_HEIGHT_PX;

/** Vertical slot per row on the canvas (matches card height). */
export const INGEST_HUB_DEMO_STREAMS_FLOW_ROW_CARD_HEIGHT_PX =
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX;

export const ingestHubDemoStreamsFlowCardPanelInsetStyle: CSSProperties = {
  padding: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_INSET_PX,
  boxSizing: 'border-box',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
};

export const ingestHubDemoStreamsFlowCardPanelCss = `
  border-radius: 6px;
  width: 100%;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
`;

export const ingestHubDemoStreamsFlowCardBodyCss = `
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  gap: 0;
  min-width: 0;
  width: 100%;

  & .euiTitle,
  & p {
    margin-block: 0;
  }
`;
