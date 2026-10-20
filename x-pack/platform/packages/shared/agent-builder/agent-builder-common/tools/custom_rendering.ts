/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType } from '@kbn/visualization-utils';

export interface VisualizationElementAttributes {
  toolResultId?: string;
  chartType?: ChartType;
}

export const visualizationElement = {
  tagName: 'visualization',
  attributes: {
    toolResultId: 'tool-result-id',
    chartType: 'chart-type',
  },
};

export interface DashboardElementAttributes {
  toolResultId?: string;
}

export const dashboardElement = {
  tagName: 'dashboard',
  attributes: {
    toolResultId: 'tool-result-id',
  },
};

export interface RenderAttachmentElementAttributes {
  attachmentId?: string;
  version?: number | string;
}

export const renderAttachmentElement = {
  tagName: 'render_attachment',
  attributes: {
    attachmentId: 'id',
    version: 'version',
  },
};

export interface RenderElementAttributes {
  path?: string;
  type?: string;
}

export const renderElement = {
  tagName: 'render',
  attributes: {
    path: 'path',
    type: 'type',
  },
};

/** A segment of a text: plain text, or a custom element tag such as `<render_attachment />`. */
export type CustomElementSegment =
  | { type: 'text'; text: string }
  | { type: 'element'; tag: string };

/**
 * Reads an attribute of a custom element tag. Matches it at the start or after whitespace, so
 * `id` doesn't match `field-id`.
 */
export const getCustomElementAttribute = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'))?.[1];

/**
 * Splits a text into the custom element tags with the given name and the text around them, in
 * order. Tags can be anywhere, including inline with prose. Whitespace-only text is dropped.
 */
export const splitCustomElements = (text: string, tagName: string): CustomElementSegment[] => {
  const segments: CustomElementSegment[] = [];
  let cursor = 0;

  const pushText = (value: string) => {
    if (value.trim()) {
      segments.push({ type: 'text', text: value });
    }
  };

  for (const match of text.matchAll(new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi'))) {
    pushText(text.slice(cursor, match.index));
    segments.push({ type: 'element', tag: match[0] });
    cursor = (match.index ?? 0) + match[0].length;
  }

  pushText(text.slice(cursor));

  return segments;
};
