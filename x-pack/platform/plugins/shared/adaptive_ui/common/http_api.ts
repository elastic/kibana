/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const internalApiPath = '/internal/adaptive_ui';

export const adaptiveUiApiPaths = {
  /** Rasterizes a posted `ViewSpec` to PNG. */
  renderPng: `${internalApiPath}/share/png`,
  /** Posts a `ViewSpec` to Slack as Block Kit through a `.slack2` connector. */
  postToSlack: `${internalApiPath}/share/slack`,
} as const;

/** Connector type id the share menu's Slack destination requires. */
export const SLACK_CONNECTOR_TYPE_ID = '.slack2';

/**
 * Body ceiling for routes that carry a `ViewSpec`. Every adapter in
 * `adapterGallery` serializes under 3 KB, so this leaves room for a large
 * agent-authored view while keeping the rasterizer off unbounded input.
 */
export const MAX_VIEW_SPEC_BYTES = 256 * 1024;

export interface RenderPngRequestBody {
  spec: Record<string, unknown>;
}

export interface PostToSlackRequestBody {
  connectorId: string;
  channel: string;
  spec: Record<string, unknown>;
  threadTs?: string;
}

export interface PostToSlackResponse {
  ts?: string;
  blocks: number;
}
