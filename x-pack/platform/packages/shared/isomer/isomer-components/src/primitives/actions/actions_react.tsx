/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import { nodeAnchor, sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { oneLine, type ComponentsRenderContext } from '../../lib';
import { reactAppHref } from '../link/resolve_link';
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

const reactButtonHref = (
  { url, app, path }: ActionsNode['buttons'][number],
  context: ComponentsRenderContext
) => {
  if (url !== undefined) {
    return sanitizeNavigationHref(url);
  }
  return app === undefined ? null : reactAppHref({ app, path }, context);
};

export const actionsReactRenderer = (
  node: ActionsNode,
  { context }: { context: ComponentsRenderContext }
) => (
  <p {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
    {node.buttons.map((button, index) => {
      const { label, primary } = button;
      // A button the host can't resolve is shown as text, like a URL it can't open.
      const href = reactButtonHref(button, context);
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
