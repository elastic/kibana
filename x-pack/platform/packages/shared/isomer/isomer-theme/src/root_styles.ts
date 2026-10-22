/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StylesCollector } from '@elastic/distillate';
import { rule } from '@elastic/distillate';
import { collectCardStyles } from './card_frame';
import { ISOMER_ROOT_CLASS, isomerDistillery } from './distillery';

const ROOT_SELECTOR = `.${ISOMER_ROOT_CLASS}`;

/** EUI's base text style for the `section` every Isomer surface wraps content in; without `data-theme` it inherits the host's color scheme. */
export const rootStyles = isomerDistillery.createStyleModule(
  'isomerRoot',
  ({ decls, tokens: { color, font } }) => ({
    root: rule(
      () => ROOT_SELECTOR,
      decls`
        color: ${color.text.paragraph};
        font-family: ${font.family.sans};
        font-size: ${font.size.s};
        line-height: ${font.lineHeight.s};
      `,
      { auto: false }
    ),
  })
);

/** Collects the root styles and the snapshot card's, which no primitive resolves on its own. */
export const collectRootStyles = (collector: StylesCollector): void => {
  collector.use([rootStyles.handles.root]);
  collectCardStyles(collector);
};
