/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StylesCollector } from '@elastic/distillate';
import type { Frame } from '@elastic/isomer-sdk';
import { borealisDark, borealisLight } from './borealis_tokens.generated';
import { ISOMER_ROOT_CLASS, isomerDistillery } from './distillery';
import type { BorealisTokenValues } from './to_token_values';

const WIDTH = 760;
const PADDING = parseFloat(borealisLight.size.l);

/** Width the card lays its body out in, for primitives that estimate how their text wraps. */
export const CARD_CONTENT_WIDTH = WIDTH - 2 * PADDING;

/**
 * Height of a node whose primitive declares no `metrics.snapshotHeight`, so an unmeasured body doesn't draw a zero-height image.
 * A stopgap until Isomer measures content height itself.
 */
export const CARD_FALLBACK_NODE_HEIGHT = 120;

// The card's padding is the body's inset, so the outer margins of its first and last nodes go.
const bodyStyles = isomerDistillery.createStyleModule('isomerCardBody', ({ css }) => ({
  root: css`
    & > :first-child {
      margin-top: 0;
    }
    & > :last-child {
      margin-bottom: 0;
    }
  `,
}));

/** Collects the card body's styles, which the frame applies without resolving them through a render context. */
export const collectCardStyles = (collector: StylesCollector): void => {
  collector.useHandles([bodyStyles.handles.root]);
};

/** A 760px Borealis card: the default frame of Kibana's `snapshot` surface. */
export const kibanaCardFrame: Frame<BorealisTokenValues> = {
  defaultWidth: WIDTH,
  theme: { light: borealisLight, dark: borealisDark },
  estimateHeight: ({ body }, { estimateSnapshotHeight }) =>
    body.reduce(
      (height, node) => height + (estimateSnapshotHeight(node) || CARD_FALLBACK_NODE_HEIGHT),
      2 * PADDING
    ),
  // The `.isomer` class scopes the theme's CSS variables, which the snapshot stylesheet reads. The body flows as blocks, as it does on the web, so adjacent margins collapse; centering splits whatever the height estimate overshoots between top and bottom.
  wrap: (_header, body, { width, height, theme: { color } }) => (
    <div
      className={ISOMER_ROOT_CLASS}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxSizing: 'border-box',
        width,
        height,
        padding: PADDING,
        background: color.background.plain,
      }}
    >
      <div className={bodyStyles.handles.root.readableName} style={{ display: 'block' }}>
        {body}
      </div>
    </div>
  ),
};
