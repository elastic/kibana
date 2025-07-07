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

import { useLinks } from '../../../../../hooks';

import { markdownRenderers } from './markdown_renderers';
import MarkdownIt from 'markdown-it';

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

  const markdownWithCollapsable = useMemo(() => wrapAllExportedFieldsTables(markdown), [markdown]);

  return (
    <>
      {markdownWithCollapsable !== undefined ? (
        <EuiText grow={true}>
          <ReactMarkdown
            transformImageUri={handleImageUri}
            components={markdownRenderers(refs)}
            rehypePlugins={[rehypeRaw, [rehypeSanitize]]}
            remarkPlugins={[remarkGfm]}
          >
            {markdownWithCollapsable}
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
