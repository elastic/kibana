/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString } from '@elastic/isomer-sdk';

/** Input-size guard against far too much text; not a layout limit. */
export const MAX_TEXT_LENGTH = 10_000;

/** Input-size guard on the data points one chart holds; not a layout limit. */
export const MAX_DATA_POINTS = 10_000;

/** Input-size guard on the grid a chart aligns its data to, every position by every row or series, gaps included. */
export const MAX_GRID_CELLS = 40_000;

/** Authored text: a label, a title, a unit. */
export const labelText = () => requiredString().max(MAX_TEXT_LENGTH);

/** Title and description every chart takes, for its figure's accessible name and every text surface. */
export const chartHeading = {
  title: labelText()
    .describe(
      'What the chart shows, as a short phrase, e.g. `Requests by host`. Names the figure on every surface.'
    )
    .optional(),
  description: labelText()
    .describe(
      'One sentence of context a reader needs and the chart cannot show, e.g. the data source or a caveat.'
    )
    .optional(),
};

/** A stable identity distinct from the label, so two items may share a label. */
export const keyField = (what: string) =>
  labelText()
    .describe(
      `Stable identity of this ${what}, unique among its siblings. Defaults to its label; set it when labels repeat or a selection binds to it.`
    )
    .optional();
