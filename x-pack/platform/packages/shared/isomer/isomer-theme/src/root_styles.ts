/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rule } from '@elastic/distillate';
import { ISOMER_ROOT_CLASS, isomerDistillery } from './distillery';

const root = `.${ISOMER_ROOT_CLASS}`;

/** EUI's base text style and color scheme for the `section` every Isomer surface wraps content in. */
export const rootStyles = isomerDistillery.createStyleModule(
  'isomerRoot',
  ({ decls, tokens: { color, font } }) => ({
    root: rule(
      () => root,
      decls`
        color: ${color.text.paragraph};
        font-family: ${font.family.sans};
        font-size: ${font.size.s};
        line-height: 1.5;
        color-scheme: light dark;
      `,
      { auto: false }
    ),
    light: rule(() => `${root}[data-theme='light']`, decls`color-scheme: light;`, { auto: false }),
    dark: rule(() => `${root}[data-theme='dark']`, decls`color-scheme: dark;`, { auto: false }),
  })
);
