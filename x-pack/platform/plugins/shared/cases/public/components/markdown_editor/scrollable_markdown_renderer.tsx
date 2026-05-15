/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

import { MarkdownRenderer } from './renderer';
import { MarkdownErrorBoundary } from './markdown_error_boundary';

export const getContentWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: ${`${euiTheme.size.m} ${euiTheme.size.l}`};
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

const ScrollableMarkdownRenderer = ({ content }: { content: string }) => {
  const { euiTheme } = useEuiTheme();
  // eslint-disable-next-line no-console
  console.log(
    '[Cases:ScrollableMarkdown] rendering, content length:',
    content?.length,
    'content preview:',
    content?.slice(0, 80)
  );
  return (
    <div
      className={'eui-xScroll'}
      css={getContentWrapperCss(euiTheme)}
      data-test-subj="scrollable-markdown"
    >
      <MarkdownErrorBoundary content={content}>
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </MarkdownErrorBoundary>
    </div>
  );
};

ScrollableMarkdownRenderer.displayName = 'ScrollableMarkdownRenderer';

export const ScrollableMarkdown = React.memo(ScrollableMarkdownRenderer);
