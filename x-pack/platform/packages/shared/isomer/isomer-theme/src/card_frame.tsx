/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Frame } from '@elastic/isomer-sdk';
import { borealisDark, borealisLight } from './borealis_tokens.generated';
import { ISOMER_ROOT_CLASS } from './distillery';
import type { BorealisTokenValues } from './to_token_values';

const { size } = borealisLight;
const PADDING = parseFloat(size.l);
const GAP = parseFloat(size.base);

/**
 * Height of a node whose primitive declares no `metrics.snapshotHeight`, so an unmeasured body doesn't draw a zero-height image.
 * A stopgap until Isomer measures content height itself.
 */
export const CARD_FALLBACK_NODE_HEIGHT = 120;

/** A 760px Borealis card: the default frame of Kibana's `snapshot` surface. */
export const kibanaCardFrame: Frame<BorealisTokenValues> = {
  defaultWidth: 760,
  theme: { light: borealisLight, dark: borealisDark },
  estimateHeight: ({ body }, { estimateSnapshotHeight }) =>
    body.reduce(
      (height, node) => height + (estimateSnapshotHeight(node) || CARD_FALLBACK_NODE_HEIGHT),
      2 * PADDING + Math.max(0, body.length - 1) * GAP
    ),
  // The `.isomer` class scopes the theme's CSS variables, which the snapshot stylesheet reads.
  wrap: (_header, body, { width, height, theme: { color } }) => (
    <div
      className={ISOMER_ROOT_CLASS}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        boxSizing: 'border-box',
        width,
        height,
        padding: PADDING,
        background: color.background.plain,
      }}
    >
      {body}
    </div>
  ),
};
