/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderHTML,
  renderMarkdown,
  renderSlack,
  renderText,
  type ViewSpec,
} from '@kbn/adaptive-ui';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const toTextDownload = (spec: ViewSpec): string => renderText(spec);

export const toMarkdownDownload = (spec: ViewSpec): string => renderMarkdown(spec);

/**
 * Wraps the HTML surface's markup in a standalone document. The shadow root and
 * its `:host { all: initial }` reset are host-page isolation concerns with no
 * counterpart in a file; progressive enhancements are not carried, so
 * interactive primitives land static.
 */
export const toHtmlDownload = (spec: ViewSpec): string => {
  const { html, css } = renderHTML(spec, { css: 'separate' });
  const title = escapeHtml(spec.title ?? 'View');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>
`;
};

export const toViewSpecJsonDownload = (spec: ViewSpec): string => JSON.stringify(spec, null, 2);

/**
 * The Block Kit payload as the Slack destination would send it, minus the chart
 * uploads the server performs — charts appear as their placeholder `image`
 * blocks. For inspecting a render, not for replaying into Slack.
 */
export const toBlockKitJsonDownload = (spec: ViewSpec): string => {
  const { text, blocks } = renderSlack(spec);
  return JSON.stringify({ text, blocks }, null, 2);
};
