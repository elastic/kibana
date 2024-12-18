/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import type { Stackframe } from '@kbn/apm-types';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  CSharpFrameHeadingRenderer,
  DefaultFrameHeadingRenderer,
  FrameHeadingRendererProps,
  JavaFrameHeadingRenderer,
  JavaScriptFrameHeadingRenderer,
  RubyFrameHeadingRenderer,
  PhpFrameHeadingRenderer,
} from './frame_heading_renderers';

function LibraryFrameFileDetail({ children }: { children?: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        color: ${euiTheme.colors.darkShade};
        word-break: break-word;
      `}
    >
      {children}
    </span>
  );
}

function AppFrameFileDetail({ children }: { children?: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        color: ${euiTheme.colors.fullShade};
        word-break: break-word;
      `}
    >
      {children}
    </span>
  );
}

interface Props {
  codeLanguage?: string;
  stackframe: Stackframe;
  isLibraryFrame: boolean;
  idx: string;
}

function FrameHeading({ codeLanguage, stackframe, isLibraryFrame, idx }: Props) {
  const { euiTheme } = useEuiTheme();

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
    <div
      data-test-subj="FrameHeading"
      css={css`
        color: ${euiTheme.colors.darkShade};
        line-height: 1.5; /* matches the line-hight of the accordion container button */
        padding: 2px 0;
        font-family: ${euiTheme.font.familyCode};
        font-size: ${useEuiFontSize('s').fontSize};
      `}
    >
      <Renderer fileDetailComponent={FileDetail} stackframe={stackframe} idx={idx} />
    </div>
  );
}

export { FrameHeading };
