/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Renderers } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import { oneLine, type ComponentsPackTypes } from '../../lib';
import type { SectionNode } from './section';

const { handles } = isomerDistillery.createStyleModule(
  'componentsSection',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      margin: ${size.l} 0;

      &:first-child {
        margin-top: 0;
      }
    `,
    title: css`
      margin: 0 0 ${size.s};
      color: ${color.text.heading};
      font-size: ${font.size.m};
      font-weight: ${font.weight.bold};
      line-height: ${font.lineHeight.m};
    `,
  })
);

export const sectionReactRenderer: Renderers<SectionNode, ComponentsPackTypes>['react'] = (
  node,
  { context, scope }
) => (
  <section {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
    <h4 className={classNames(context, handles.title)}>{oneLine(node.title)}</h4>
    {node.body.map((child, index) => (
      <React.Fragment key={index}>{scope.renderReact(child, context)}</React.Fragment>
    ))}
  </section>
);
