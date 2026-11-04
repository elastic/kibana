/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor, sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { oneLine } from '../../lib';
import type { ActionsNode } from './actions';

const { handles } = isomerDistillery.createStyleModule(
  'componentsActions',
  ({ css, tokens: { border, color, font, size } }) => ({
    root: css`
      display: flex;
      flex-wrap: wrap;
      gap: ${size.s};
      margin: ${size.m} 0;
    `,
    button: css`
      display: inline-block;
      padding: ${size.xs} ${size.m};
      border: ${border.width.thin} solid ${color.border.plain};
      border-radius: ${border.radius.control};
      color: ${color.text.primary};
      font-size: ${font.size.s};
      font-weight: ${font.weight.semiBold};
      line-height: ${font.lineHeight.s};
      text-decoration: none;
    `,
    primary: css`
      border-color: ${color.background.filled.primary};
      background: ${color.background.filled.primary};
      color: ${color.text.inverse};
    `,
  })
);

export const actionsReactRenderer = (
  node: ActionsNode,
  { context }: { context: StyledRenderContext }
) => (
  <p {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
    {node.buttons.map(({ label, url, primary }, index) => {
      const href = sanitizeNavigationHref(url);
      const className = classNames(context, handles.button, primary ? handles.primary : undefined);
      return href ? (
        <a key={index} href={href} className={className}>
          {oneLine(label)}
        </a>
      ) : (
        <span key={index} className={className}>
          {oneLine(label)}
        </span>
      );
    })}
  </p>
);
