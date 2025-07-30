/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';
import styled from '@emotion/styled';
import { useEuiFontSize } from '@elastic/eui';
import { Stackframe } from '@kbn/apm-types';
import {
  CSharpFrameHeadingRenderer,
  DefaultFrameHeadingRenderer,
  JavaFrameHeadingRenderer,
  JavaScriptFrameHeadingRenderer,
  RubyFrameHeadingRenderer,
  PhpFrameHeadingRenderer,
  FrameHeadingRendererProps,
} from './frame_heading_renderers';

const FileDetails = styled.div`
  color: ${({ theme }) => theme.euiTheme.colors.darkShade};
  line-height: 1.5; /* matches the line-hight of the accordion container button */
  padding: 2px 0;
  font-family: ${({ theme }) => theme.euiTheme.font.familyCode};
  font-size: ${({ theme }) => useEuiFontSize('s').fontSize};
`;

const LibraryFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.euiTheme.colors.darkShade};
  word-break: break-word;
`;

const AppFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.euiTheme.colors.fullShade};
  word-break: break-word;
`;

interface Props {
  codeLanguage?: string;
  stackframe: Stackframe;
  isLibraryFrame: boolean;
  idx: string;
}

function FrameHeading({ codeLanguage, stackframe, isLibraryFrame, idx }: Props) {
  const FileDetail: ComponentType = isLibraryFrame ? LibraryFrameFileDetail : AppFrameFileDetail;
  let Renderer: ComponentType<FrameHeadingRendererProps>;
  switch (codeLanguage?.toString().toLowerCase()) {
    case 'c#':
      Renderer = CSharpFrameHeadingRenderer;
      break;
    case 'java':
      Renderer = JavaFrameHeadingRenderer;
      break;
    case 'javascript':
      Renderer = JavaScriptFrameHeadingRenderer;
      break;
    case 'ruby':
      Renderer = RubyFrameHeadingRenderer;
      break;
    case 'php':
      Renderer = PhpFrameHeadingRenderer;
      break;
    default:
      Renderer = DefaultFrameHeadingRenderer;
      break;
  }

  return (
    <FileDetails data-test-subj="FrameHeading" data-library-frame={isLibraryFrame}>
      <Renderer fileDetailComponent={FileDetail} stackframe={stackframe} idx={idx} />
    </FileDetails>
  );
}

export { FrameHeading };
