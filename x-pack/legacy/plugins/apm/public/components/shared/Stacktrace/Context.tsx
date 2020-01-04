/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { size } from 'lodash';
import { tint } from 'polished';
import React from 'react';
// TODO add dependency for @types/react-syntax-highlighter
// @ts-ignore
import javascript from 'react-syntax-highlighter/dist/languages/javascript';
// @ts-ignore
import python from 'react-syntax-highlighter/dist/languages/python';
// @ts-ignore
import ruby from 'react-syntax-highlighter/dist/languages/ruby';
// @ts-ignore
import SyntaxHighlighter from 'react-syntax-highlighter/dist/light';
// @ts-ignore
import { registerLanguage } from 'react-syntax-highlighter/dist/light';
// @ts-ignore
import { xcode } from 'react-syntax-highlighter/dist/styles';
import styled from 'styled-components';
import { IStackframeWithLineContext } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { borderRadius, px, unit, units } from '../../../style/variables';

registerLanguage('javascript', javascript);
registerLanguage('python', python);
registerLanguage('ruby', ruby);

const ContextContainer = styled.div`
  position: relative;
  border-radius: ${borderRadius};
`;

const LINE_HEIGHT = units.eighth * 9;
const LineHighlight = styled.div<{ lineNumber: number }>`
  position: absolute;
  width: 100%;
  height: ${px(units.eighth * 9)};
  top: ${props => px(props.lineNumber * LINE_HEIGHT)};
  pointer-events: none;
  background-color: ${tint(0.1, theme.euiColorWarning)};
`;

const LineNumberContainer = styled.div<{ isLibraryFrame: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: ${borderRadius};
  background: ${props =>
    props.isLibraryFrame
      ? theme.euiColorEmptyShade
      : theme.euiColorLightestShade};
`;

const LineNumber = styled.div<{ highlight: boolean }>`
  position: relative;
  min-width: ${px(units.eighth * 21)};
  padding-left: ${px(units.half)};
  padding-right: ${px(units.quarter)};
  color: ${theme.euiColorMediumShade};
  line-height: ${px(unit + units.eighth)};
  text-align: right;
  border-right: 1px solid ${theme.euiColorLightShade};
  background-color: ${props =>
    props.highlight ? tint(0.1, theme.euiColorWarning) : null};

  &:last-of-type {
    border-radius: 0 0 0 ${borderRadius};
  }
`;

const LineContainer = styled.div`
  overflow: auto;
  margin: 0 0 0 ${px(units.eighth * 21)};
  padding: 0;
  background-color: ${theme.euiColorEmptyShade};

  &:last-of-type {
    border-radius: 0 0 ${borderRadius} 0;
  }
`;

const Line = styled.pre`
  /* Override all styles */
  margin: 0;
  color: inherit;
  background: inherit;
  border: 0;
  border-radius: 0;
  overflow: initial;
  padding: 0 ${px(LINE_HEIGHT)};
  line-height: ${px(LINE_HEIGHT)};
`;

const Code = styled.code`
  position: relative;
  padding: 0;
  margin: 0;
  white-space: pre;
  z-index: 2;
`;

function getStackframeLines(stackframe: IStackframeWithLineContext) {
  const line = stackframe.line.context;
  const preLines = stackframe.context?.pre || [];
  const postLines = stackframe.context?.post || [];
  return [...preLines, line, ...postLines];
}

function getStartLineNumber(stackframe: IStackframeWithLineContext) {
  const preLines = size(stackframe.context?.pre || []);
  return stackframe.line.number - preLines;
}

interface Props {
  stackframe: IStackframeWithLineContext;
  codeLanguage?: string;
  isLibraryFrame: boolean;
}

export function Context({ stackframe, codeLanguage, isLibraryFrame }: Props) {
  const lines = getStackframeLines(stackframe);
  const startLineNumber = getStartLineNumber(stackframe);
  const highlightedLineIndex = size(stackframe.context?.pre || []);
  const language = codeLanguage || 'javascript'; // TODO: Add support for more languages

  return (
    <ContextContainer>
      <LineHighlight lineNumber={highlightedLineIndex} />
      <LineNumberContainer isLibraryFrame={isLibraryFrame}>
        {lines.map((line, i) => (
          <LineNumber key={line + i} highlight={highlightedLineIndex === i}>
            {i + startLineNumber}.
          </LineNumber>
        ))}
      </LineNumberContainer>
      <LineContainer>
        {lines.map((line, i) => (
          <SyntaxHighlighter
            key={line + i}
            language={language}
            style={xcode}
            PreTag={Line}
            CodeTag={Code}
            customStyle={{ padding: null, overflowX: null }}
          >
            {line || '\n'}
          </SyntaxHighlighter>
        ))}
      </LineContainer>
    </ContextContainer>
  );
}
