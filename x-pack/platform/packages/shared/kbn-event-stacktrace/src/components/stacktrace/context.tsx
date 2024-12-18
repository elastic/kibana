/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { size } from 'lodash';
import { tint } from 'polished';
import React from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/cjs/languages/hljs/python';
import ruby from 'react-syntax-highlighter/dist/cjs/languages/hljs/ruby';
import xcode from 'react-syntax-highlighter/dist/cjs/styles/hljs/xcode';
import { StackframeWithLineContext } from '@kbn/apm-types/src/es_schemas/raw/fields/stackframe';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('ruby', ruby);

const LINE_HEIGHT = 18;

function getStackframeLines(stackframe: StackframeWithLineContext) {
  const line = stackframe.line.context;
  const preLines = stackframe.context?.pre || [];
  const postLines = stackframe.context?.post || [];
  return [...preLines, line, ...postLines].map(
    (x) => (x.endsWith('\n') ? x.slice(0, -1) : x) || ' '
  );
}

function getStartLineNumber(stackframe: StackframeWithLineContext) {
  const preLines = size(stackframe.context?.pre || []);
  return stackframe.line.number - preLines;
}

interface Props {
  stackframe: StackframeWithLineContext;
  codeLanguage?: string;
  isLibraryFrame: boolean;
}

function Line({ children }: { children?: React.ReactNode }) {
  return (
    <pre
      css={css`
        margin: 0;
        color: inherit;
        background: inherit;
        border: 0;
        border-radius: 0;
        overflow: initial;
        padding: 0 ${LINE_HEIGHT}px;
        line-height: ${LINE_HEIGHT}px;
      `}
    >
      {children}
    </pre>
  );
}

function Code({ children }: { children?: React.ReactNode }) {
  return (
    <code
      css={css`
        position: relative;
        padding: 0;
        margin: 0;
        white-space: pre;
        z-index: 2;
      `}
    >
      {children}
    </code>
  );
}

export function Context({ stackframe, codeLanguage, isLibraryFrame }: Props) {
  const { euiTheme } = useEuiTheme();
  const lines = getStackframeLines(stackframe);
  const startLineNumber = getStartLineNumber(stackframe);
  const highlightedLineIndex = size(stackframe.context?.pre || []);
  const language = codeLanguage || 'javascript'; // TODO: Add support for more languages

  return (
    <div
      css={css`
        position: relative;
        border-radius: ${euiTheme.border.radius.small};
      `}
    >
      <div
        css={css`
          position: absolute;
          width: 100%;
          height: ${LINE_HEIGHT}px;
          top: ${highlightedLineIndex * LINE_HEIGHT}px;
          pointer-events: none;
          background-color: ${tint(0.9, euiTheme.colors.warning)};
        `}
      />
      <div
        css={css`
          position: absolute;
          top: 0;
          left: 0;
          border-radius: ${euiTheme.border.radius.small};
          background: ${isLibraryFrame
            ? euiTheme.colors.emptyShade
            : euiTheme.colors.lightestShade};
        `}
      >
        {lines.map((line, i) => (
          <div
            key={line + i}
            css={css`
              position: relative;
              min-width: 42px;
              padding-left: ${euiTheme.size.s};
              padding-right: ${euiTheme.size.xs};
              color: ${euiTheme.colors.mediumShade};
              line-height: ${LINE_HEIGHT}px;
              text-align: right;
              border-right: 1px solid ${euiTheme.colors.lightShade};
              background-color: ${highlightedLineIndex === i
                ? tint(0.9, euiTheme.colors.warning)
                : null};
              &:last-of-type {
                border-radius: 0 0 0 ${euiTheme.border.radius.small};
              }
            `}
          >
            {i + startLineNumber}.
          </div>
        ))}
      </div>
      <div
        css={css`
          overflow: auto;
          margin: 0 0 0 42px;
          padding: 0;
          background-color: ${euiTheme.colors.emptyShade};
          &:last-of-type {
            border-radius: 0 0 ${euiTheme.border.radius.small} 0;
          }
        `}
      >
        {lines.map((line, i) => (
          <SyntaxHighlighter
            key={line + i}
            language={language}
            style={xcode}
            PreTag={Line}
            CodeTag={Code}
            customStyle={{ padding: undefined, overflowX: undefined }}
          >
            {line}
          </SyntaxHighlighter>
        ))}
      </div>
    </div>
  );
}
