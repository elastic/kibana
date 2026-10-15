/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

/** Pixel height of a dashboard grid row, and the margin between two rows. */
const ROW_HEIGHT_PX = 20;
const ROW_MARGIN_PX = 8;

const MAX_PREFERRED_HEIGHT = 30;

/** Rough rendering of markdown text in a half-width panel. */
const MARKDOWN_CHARACTERS_PER_LINE = 100;
const MARKDOWN_LINE_HEIGHT_PX = 24;
const MARKDOWN_HEADING_LINE_HEIGHT_PX = 32;
const MARKDOWN_PARAGRAPH_GAP_PX = 12;
const MARKDOWN_PADDING_PX = 32;

/** Returns the grid rows a panel needs to show content of the given pixel height. */
export const getGridRowsForPixelHeight = (pixelHeight: number): number =>
  Math.min(
    Math.max(Math.ceil((pixelHeight + ROW_MARGIN_PX) / (ROW_HEIGHT_PX + ROW_MARGIN_PX)), 1),
    MAX_PREFERRED_HEIGHT
  );

const getMarkdownPixelHeight = (content: string): number => {
  const blocks = content.trim().split(/\n\s*\n/);
  const lines = blocks.flatMap((block) => block.split('\n').filter((line) => line.trim() !== ''));
  const linesHeight = lines.reduce(
    (height, line) =>
      height +
      (line.trimStart().startsWith('#')
        ? MARKDOWN_HEADING_LINE_HEIGHT_PX
        : Math.ceil(line.length / MARKDOWN_CHARACTERS_PER_LINE) * MARKDOWN_LINE_HEIGHT_PX),
    0
  );
  return linesHeight + (blocks.length - 1) * MARKDOWN_PARAGRAPH_GAP_PX + MARKDOWN_PADDING_PX;
};

/** Returns the approximate grid rows a markdown panel needs for its text at half width. */
export const getMarkdownPreferredHeight = ({ type, config }: AttachmentPanel): number | undefined =>
  type === MARKDOWN_EMBEDDABLE_TYPE && typeof config.content === 'string'
    ? getGridRowsForPixelHeight(getMarkdownPixelHeight(config.content))
    : undefined;
