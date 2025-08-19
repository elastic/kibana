/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { StackframeWithLineContext } from '@kbn/apm-types';

function getStackframeLines(stackframe: StackframeWithLineContext) {
  const line = stackframe.line.context;
  const preLines = stackframe.context?.pre || [];
  const postLines = stackframe.context?.post || [];
  return [...preLines, line, ...postLines]
    .map((x) => (x.endsWith('\n') ? x.slice(0, -1) : x) || ' ')
    .join('\n');
}

function getStartLineNumber(stackframe: StackframeWithLineContext) {
  const preLines = (stackframe.context?.pre || []).length;
  return stackframe.line.number - preLines;
}

interface Props {
  stackframe: StackframeWithLineContext;
  codeLanguage?: string;
}

export function Context({ stackframe, codeLanguage }: Props) {
  const lines = getStackframeLines(stackframe);
  const start = getStartLineNumber(stackframe);
  const highlightedLine = start + (stackframe.context?.pre || []).length;
  const language = codeLanguage || 'javascript'; // TODO: Add support for more languages

  return (
    <EuiCodeBlock
      language={language}
      whiteSpace="pre"
      paddingSize="s"
      lineNumbers={{
        start,
        highlight: `${highlightedLine}`,
      }}
      transparentBackground
      data-test-subj="stacktraceContext"
    >
      {lines}
    </EuiCodeBlock>
  );
}
