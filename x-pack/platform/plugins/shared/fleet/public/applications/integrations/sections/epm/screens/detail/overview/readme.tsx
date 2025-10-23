/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';
import deepmerge from 'deepmerge';
// Importing GitHub schema from transitive dependency as recommended in rehype-sanitize docs
// eslint-disable-next-line import/no-extraneous-dependencies
import githubSchema from 'hast-util-sanitize/lib/github.json';

import MarkdownIt from 'markdown-it';

import { useLinks } from '../../../../../hooks';

import { markdownRenderers } from './markdown_renderers';

export function Readme({
  packageName,
  version,
  markdown,
  refs,
}: {
  packageName: string;
  version: string;
  markdown: string | undefined;
  refs: MutableRefObject<Map<string, HTMLDivElement | null>>;
}) {
  const { toRelativeImage } = useLinks();
  const handleImageUri = React.useCallback(
    (uri: string) => {
      const isRelative =
        uri.indexOf('http://') === 0 || uri.indexOf('https://') === 0 ? false : true;

      const fullUri = isRelative ? toRelativeImage({ packageName, version, path: uri }) : uri;
      return fullUri;
    },
    [toRelativeImage, packageName, version]
  );

  // Extend GitHub's sanitize schema to allow className on spans for tooltip support
  // The schema already includes 'title' globally and all standard markdown tags
  const sanitizeSchema = useMemo(
    () =>
      deepmerge(githubSchema, {
        attributes: {
          span: ['className'], // Add className for tooltip wrapper
        },
      }),
    []
  );

  const wrapAllExportedFieldsTables = (content: string | undefined): string | undefined => {
    if (!content) return content;

    const md = new MarkdownIt();
    const tokens = md.parse(content, {});
    const lines = content.split('\n');

    const exportedFieldsLines: number[] = lines
      .map((line, index) => (line.trim() === '**Exported fields**' ? index : -1))
      .filter((index) => index !== -1);

    if (exportedFieldsLines.length === 0) return content;

    const tableRanges: Array<[number, number]> = tokens
      .filter((token) => token.type === 'table_open' && token.map)
      .map((token) => token.map as [number, number]);

    const usedTables = new Set<number>();
    const insertions: Array<{ summaryLine: number; start: number; end: number }> = [];

    for (const summaryLine of exportedFieldsLines) {
      // Find the first table that starts after the summary line and hasn't been used yet
      const table = tableRanges.find(([start], idx) => start > summaryLine && !usedTables.has(idx));
      if (table) {
        const [start, end] = table;
        usedTables.add(tableRanges.indexOf(table));
        insertions.push({ summaryLine, start, end });
      }
    }

    const newLines: string[] = [];
    let currentLine = 0;

    for (const { summaryLine, start, end } of insertions) {
      newLines.push(...lines.slice(currentLine, summaryLine));
      currentLine = summaryLine + 1;

      newLines.push(...lines.slice(currentLine, start));
      currentLine = start;

      newLines.push('<details><summary>Exported fields</summary>', '');
      newLines.push(...lines.slice(start, end));
      newLines.push('', '</details>');

      currentLine = end;
    }

    newLines.push(...lines.slice(currentLine));

    return newLines.join('\n');
  };

  const wrapSampleEvents = (content: string | undefined): string | undefined => {
    if (!content) return content;

    // Use regex to find the pattern and code block together
    // This pattern matches the intro text and the following code block
    const regex =
      /(An example event looks as following|An example event for.*?:?)(\s*```[\s\S]*?```)/g;

    // Replace with the collapsible structure
    return content.replace(regex, (_match, _introText, codeBlock) => {
      return `<details>\n<summary>Example</summary>\n${codeBlock}\n</details>`;
    });
  };

  const convertTooltipSyntax = (content: string | undefined): string | undefined => {
    if (!content) return content;

    // Matches EUI tooltip syntax: !{tooltip[anchor text](tooltip content)}
    // This regex captures the anchor text and tooltip content separately
    const tooltipRegex = /!\{tooltip\[([^\]]+)\]\(([^)]+)\)\}/g;

    // Replace with a custom HTML structure that we can render with a custom component
    return content.replace(tooltipRegex, (_match, anchorText, tooltipContent) => {
      // Use title attribute which is allowed by default in rehype-sanitize
      // We'll render this with EuiToolTip in the custom component
      return `<span class="eui-tooltip-wrapper" title="${tooltipContent.replace(
        /"/g,
        '&quot;'
      )}">${anchorText}</span>`;
    });
  };

  const processedMarkdown = useMemo(() => {
    if (!markdown) return markdown;
    let processedContent = wrapAllExportedFieldsTables(markdown);
    processedContent = wrapSampleEvents(processedContent);
    processedContent = convertTooltipSyntax(processedContent);
    return processedContent;
  }, [markdown]);

  return (
    <>
      {processedMarkdown !== undefined ? (
        <EuiText grow={true}>
          <ReactMarkdown
            transformImageUri={handleImageUri}
            components={markdownRenderers(refs)}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
            remarkPlugins={[remarkGfm]}
          >
            {processedMarkdown}
          </ReactMarkdown>
        </EuiText>
      ) : (
        <EuiText>
          {/* simulates a long page of text loading */}

          <EuiSkeletonText lines={5} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={6} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={4} />
        </EuiText>
      )}
    </>
  );
}
