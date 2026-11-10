/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import { oneLine } from '../../lib';
import { HEADING_DEPTH, type HeaderNode } from './header';

const { handles } = isomerDistillery.createStyleModule(
  'componentsHeader',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      margin: ${size.l} 0 ${size.s};
      color: ${color.text.heading};
      font-weight: ${font.weight.bold};

      &:first-child {
        margin-top: 0;
      }
    `,
    level1: css`
      font-size: ${font.size.xl};
      line-height: ${font.lineHeight.xl};
    `,
    level2: css`
      font-size: ${font.size.l};
      line-height: ${font.lineHeight.l};
    `,
    level3: css`
      font-size: ${font.size.m};
      line-height: ${font.lineHeight.m};
    `,
    level4: css`
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
  })
);

export const headerReactRenderer = (
  node: HeaderNode,
  { context }: { context: StyledRenderContext }
) => {
  const Heading = `h${HEADING_DEPTH[node.level ?? 1]}` as const;
  return (
    <Heading
      {...nodeAnchor(context, node)}
      className={classNames(context, handles.root, handles[`level${node.level ?? 1}`])}
    >
      {oneLine(node.text)}
    </Heading>
  );
};
