/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
} from './ingest_hub_demo_streams_flow_card_layout';

export const ingestHubDemoStreamsFlowCardShellStyle = (
  dimmed: boolean
): CSSProperties => ({
  width: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  minWidth: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  maxWidth: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_WIDTH_PX,
  height: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
  minHeight: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
  maxHeight: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEIGHT_PX,
  opacity: dimmed ? 0.38 : 1,
  transition: 'opacity 120ms ease',
  boxSizing: 'border-box',
  overflow: 'hidden',
});
