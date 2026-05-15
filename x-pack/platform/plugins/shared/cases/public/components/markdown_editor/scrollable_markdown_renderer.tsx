/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

import { MarkdownRenderer } from './renderer';
import { MarkdownErrorBoundary } from './markdown_error_boundary';
import { escapeUnterminatedEntities } from './sanitize_markdown';

// eslint-disable-next-line no-console
console.log(
  '[Cases:scrollable_markdown_renderer.tsx] Module loaded.',
  'MarkdownRenderer imported:',
  typeof MarkdownRenderer,
  'MarkdownErrorBoundary imported:',
  typeof MarkdownErrorBoundary,
  'escapeUnterminatedEntities imported:',
  typeof escapeUnterminatedEntities
);

export const getContentWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: ${`${euiTheme.size.m} ${euiTheme.size.l}`};
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

const ScrollableMarkdownRenderer = ({ content }: { content: string }) => {
  const { euiTheme } = useEuiTheme();

  // eslint-disable-next-line no-console
  console.error(
    '[Cases:ScrollableMarkdown] RENDER ENTRY.',
    'content length:',
    content?.length,
    'content type:',
    typeof content,
    'content preview:',
    content?.slice(0, 100),
    'has ampersand:',
    content?.includes('&'),
    'ampersand count:',
    (content?.match(/&/g) || []).length
  );

  const sanitizedContent = useMemo(() => {
    // eslint-disable-next-line no-console
    console.error(
      '[Cases:ScrollableMarkdown] SANITIZING content.',
      'content length:',
      content?.length,
      'has ampersand:',
      content?.includes('&')
    );
    const result = escapeUnterminatedEntities(content);
    // eslint-disable-next-line no-console
    console.error(
      '[Cases:ScrollableMarkdown] SANITIZATION DONE.',
      'input length:',
      content?.length,
      'output length:',
      result?.length,
      'changed:',
      content !== result,
      'output has bare ampersand:',
      /&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);)/.test(result),
      'output preview:',
      result?.slice(0, 200)
    );
    return result;
  }, [content]);

  // eslint-disable-next-line no-console
  console.error(
    '[Cases:ScrollableMarkdown] RENDERING MarkdownRenderer.',
    'sanitizedContent length:',
    sanitizedContent?.length,
    'sanitizedContent === content:',
    sanitizedContent === content,
    'sanitizedContent preview:',
    sanitizedContent?.slice(0, 200)
  );

  return (
    <div
      className={'eui-xScroll'}
      css={getContentWrapperCss(euiTheme)}
      data-test-subj="scrollable-markdown"
    >
      <MarkdownErrorBoundary content={content}>
        <MarkdownRenderer>{sanitizedContent}</MarkdownRenderer>
      </MarkdownErrorBoundary>
    </div>
  );
};

ScrollableMarkdownRenderer.displayName = 'ScrollableMarkdownRenderer';

export const ScrollableMarkdown = React.memo(ScrollableMarkdownRenderer);
