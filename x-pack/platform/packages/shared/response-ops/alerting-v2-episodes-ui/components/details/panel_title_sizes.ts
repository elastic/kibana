/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTextProps, EuiTitleSize } from '@elastic/eui';

/**
 * Title sizes for the detail panels. The full details page uses the default sizes;
 * the flyout is narrower and nests its panels inside accordions that already carry
 * a heading, so it renders them one step down. Kept in one place so every panel
 * scales together.
 */
export const PANEL_TITLE_SIZE: Record<'default' | 'compressed', EuiTitleSize> = {
  default: 'xs',
  compressed: 'xxs',
};

export const PANEL_TEXT_SIZE: Record<'default' | 'compressed', EuiTextProps['size']> = {
  default: 's',
  compressed: 'xs',
};

/** Picks the title size for a panel based on whether its host asked for compressed sizing. */
export const getPanelTitleSize = (compressed?: boolean): EuiTitleSize =>
  PANEL_TITLE_SIZE[compressed ? 'compressed' : 'default'];

/** Picks the body text size for a panel based on whether its host asked for compressed sizing. */
export const getPanelTextSize = (compressed?: boolean): EuiTextProps['size'] =>
  PANEL_TEXT_SIZE[compressed ? 'compressed' : 'default'];
