/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { Stackframe as StackframeType, StackframeWithLineContext } from '@kbn/apm-types';
import { css } from '@emotion/react';
import { Context } from './context';
import { FrameHeading } from './frame_heading';
import { Variables } from './variables';

interface Props {
  stackframe: StackframeType;
  codeLanguage?: string;
  id: string;
  initialIsOpen?: boolean;
  isLibraryFrame?: boolean;
}

export function Stackframe({
  stackframe,
  codeLanguage,
  id,
  initialIsOpen = false,
  isLibraryFrame = false,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const fontSize = useEuiFontSize('s').fontSize;

  if (!hasLineContext(stackframe)) {
    return (
      // Indent the non-context frames the same amount as the accordion control
      <div
        css={css`
          margin-left: 28px;
        `}
      >
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
        />
      </div>
    );
  }

  return (
    <EuiAccordion
      buttonContent={
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
        />
      }
      id={id}
      initialIsOpen={initialIsOpen}
    >
      <div
        css={css`
          position: relative;
          font-family: ${euiTheme.font.familyCode};
          font-size: ${fontSize};
          border: 1px solid ${euiTheme.border.color};
          border-radius: ${euiTheme.border.radius.small};
          background: ${isLibraryFrame
            ? euiTheme.colors.emptyShade
            : euiTheme.colors.lightestShade};
        `}
      >
        <Context
          stackframe={stackframe}
          codeLanguage={codeLanguage}
          isLibraryFrame={isLibraryFrame}
        />
      </div>
      <Variables vars={stackframe.vars} />
    </EuiAccordion>
  );
}

function hasLineContext(stackframe: StackframeType): stackframe is StackframeWithLineContext {
  return Object.hasOwn(stackframe.line ?? {}, 'context') || false;
}
