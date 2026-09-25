/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiMarkdownFormat,
  euiMarkdownLinkValidator,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  type EuiMarkdownFormatProps,
} from '@elastic/eui';

interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string | null;
  children?: MarkdownNode[];
}

const IMAGE_NODE_TYPES = new Set(['image', 'imageReference']);

/**
 * Model-written Markdown can carry text copied from telemetry, so it is treated as untrusted:
 * images would make the browser fetch attacker-chosen URLs, and raw HTML is never rendered.
 * Both are reduced to plain text.
 */
const neutralizeUnsafeNodes = (node: MarkdownNode): void => {
  if (IMAGE_NODE_TYPES.has(node.type)) {
    node.type = 'text';
    node.value = node.alt ?? '';
    delete node.children;
    return;
  }
  if (node.type === 'html') {
    node.type = 'text';
    return;
  }
  node.children?.forEach(neutralizeUnsafeNodes);
};

const removeUnsafeNodesPlugin = () => (tree: MarkdownNode) => neutralizeUnsafeNodes(tree);

const parsingPlugins: NonNullable<EuiMarkdownFormatProps['parsingPluginList']> = [
  ...getDefaultEuiMarkdownParsingPlugins({ exclude: ['linkValidator'] }),
  // Only absolute http(s) links: no relative links into Kibana, no other protocols.
  [euiMarkdownLinkValidator, { allowRelative: false, allowProtocols: ['https:', 'http:'] }],
  [removeUnsafeNodesPlugin, {}],
];

// Links open in a new tab: an investigation may still be streaming into the surrounding view.
const processingPlugins = getDefaultEuiMarkdownProcessingPlugins({
  linkProps: { target: '_blank', rel: 'noopener noreferrer', external: true },
});

export type EvidenceMarkdownProps = Omit<
  EuiMarkdownFormatProps,
  'parsingPluginList' | 'processingPluginList'
>;

/** Renders untrusted, model-written Markdown: text, tables, code, and external links only. */
export const EvidenceMarkdown: React.FC<EvidenceMarkdownProps> = ({ children, ...props }) => (
  <EuiMarkdownFormat
    textSize="xs"
    color="subdued"
    {...props}
    parsingPluginList={parsingPlugins}
    processingPluginList={processingPlugins}
  >
    {children}
  </EuiMarkdownFormat>
);
