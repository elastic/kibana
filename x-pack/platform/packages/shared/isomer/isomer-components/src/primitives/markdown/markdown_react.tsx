/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { renderMarkdownContent } from '@elastic/isomer-sdk/react';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import type { MarkdownNode } from './markdown';

// Matches `EuiMarkdownFormat` at text size `m`:
//
// - `EuiText` for type and lists,
// - `EuiLink` for links,
// - `EuiCode` and
// - `EuiCodeBlock` (`fontSize="m"`, `paddingSize="s"`) for code, and
// - the format's table and rule borders.
//
// - Inline code uses `text.assistance` and `background.subdued`, the closest tokens to EUI's code colors.
// - Heading tracking is Borealis `font.title.letterSpacing`.
const { handles } = isomerDistillery.createStyleModule(
  'componentsMarkdown',
  ({ css, tokens: { border, color, font, size } }) => ({
    root: css`
      color: ${color.text.paragraph};
      font-size: ${font.size.m};
      font-weight: ${font.weight.regular};
      line-height: ${font.lineHeight.m};
      overflow-wrap: break-word;

      & > :last-child {
        margin-bottom: 0;
      }

      & p {
        margin: 0 0 ${font.lineHeight.m};
      }

      & :is(h1, h2, h3, h4, h5, h6) {
        margin: 0;
        color: inherit;
        font-weight: ${font.weight.bold};
        letter-spacing: -0.2px;
      }

      & :is(h1, h2, h3, h4, h5, h6):not(:last-child) {
        margin-bottom: ${size.m};
      }

      & :is(h2, h3, h4, h5, h6):not(:first-child) {
        margin-top: ${size.l};
      }

      & h1 {
        font-size: ${font.size.xxl};
        line-height: ${font.lineHeight.xxl};
      }

      & h2 {
        font-size: ${font.size.xl};
        line-height: ${font.lineHeight.xl};
      }

      & h3 {
        font-size: ${font.size.l};
        line-height: ${font.lineHeight.l};
      }

      & h4 {
        font-size: ${font.size.m};
        line-height: ${font.lineHeight.m};
      }

      & h5 {
        font-size: ${font.size.s};
        line-height: ${font.lineHeight.s};
      }

      & h6 {
        font-size: ${font.size.xs};
        line-height: ${font.lineHeight.xs};
      }

      & ul,
      & ol {
        margin: 0 0 0 ${font.lineHeight.m};
        padding: 0;
      }

      & > ul,
      & > ol {
        margin-bottom: ${font.lineHeight.m};
      }

      & ul {
        list-style-type: disc;
      }

      & ol {
        list-style-type: decimal;
      }

      & ol ol,
      & ul ol {
        list-style-type: lower-roman;
      }

      & ul ul ol,
      & ul ol ol,
      & ol ul ol,
      & ol ol ol {
        list-style-type: lower-alpha;
      }

      & a {
        color: ${color.text.paragraph};
        font-weight: ${font.weight.medium};
        text-decoration: underline dotted;
        text-decoration-thickness: ${border.width.thin};
        text-decoration-thickness: from-font;

        &:hover,
        &:focus {
          color: ${color.text.primary};
          text-decoration: underline solid;
        }
      }

      & img {
        max-inline-size: 100%;
      }

      & blockquote {
        margin: 0 0 ${font.size.m};
        padding: 0 ${font.size.m};
        border-left: calc(${font.size.m} / 4) solid ${color.border.plain};
      }

      & hr {
        height: ${border.width.thin};
        margin: ${size.base} 0;
        border: 0;
        background-color: ${color.border.plain};
        color: ${color.border.plain};
      }

      & table {
        display: block;
        width: 100%;
        margin: 0 0 ${font.size.m};
        overflow: auto;
        border-spacing: 0;
        border-collapse: collapse;
        border-left: ${border.width.thin} solid ${color.border.plain};
      }

      & tr {
        border-top: ${border.width.thin} solid ${color.border.plain};
      }

      & th,
      & td {
        padding: calc(${font.size.m} / 4) calc(${font.size.m} / 2);
        border-top: ${border.width.thin} solid ${color.border.plain};
        border-bottom: ${border.width.thin} solid ${color.border.plain};

        &:last-child {
          border-right: ${border.width.thin} solid ${color.border.plain};
        }
      }

      & code {
        padding: 0.2em 0.5em;
        border-radius: ${border.radius.inline};
        background: ${color.background.subdued};
        color: ${color.text.assistance};
        font-family: ${font.family.code};
        font-size: 0.9em;
        font-weight: ${font.weight.bold};
      }

      & pre {
        margin: 0 0 ${font.size.m};
        padding: ${size.s};
        overflow: auto;
        border-radius: ${border.radius.control};
        background: ${color.background.subdued};
        color: ${color.text.paragraph};
        font-family: ${font.family.code};
        font-size: ${font.size.s};
        line-height: ${font.lineHeight.s};
        white-space: pre-wrap;
      }

      & pre code {
        display: block;
        padding: 0;
        background: none;
        color: inherit;
        font-size: inherit;
        font-weight: inherit;
      }
    `,
  })
);

export const markdownReactRenderer = (
  node: MarkdownNode,
  { context }: { context: StyledRenderContext }
) => (
  <div {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
    {renderMarkdownContent(md.authored(node.text))}
  </div>
);
