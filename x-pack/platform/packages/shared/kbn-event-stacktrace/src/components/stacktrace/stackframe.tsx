/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, useEuiFontSize } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import type { Stackframe as StackframeType, StackframeWithLineContext } from '@kbn/apm-types';
import { Context } from './context';
import { FrameHeading } from './frame_heading';
import { Variables } from './variables';

const ContextContainer = styled.div`
  position: relative;
  font-family: ${({ theme }) => theme.euiTheme.font.familyCode};
  font-size: ${() => useEuiFontSize('s').fontSize};
  border: ${({ theme }) => theme.euiTheme.border.thin};
  border-radius: ${({ theme }) => theme.euiTheme.border.radius.small};
  background: ${({ theme }) => theme.euiTheme.colors.emptyShade};
`;

// Indent the non-context frames the same amount as the accordion control
const NoContextFrameHeadingWrapper = styled.div`
  margin-left: 28px;
`;

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
  if (!hasLineContext(stackframe)) {
    return (
      <NoContextFrameHeadingWrapper>
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
        />
      </NoContextFrameHeadingWrapper>
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
      <ContextContainer>
        <Context stackframe={stackframe} codeLanguage={codeLanguage} />
      </ContextContainer>
      <Variables vars={stackframe.vars} />
    </EuiAccordion>
  );
}

function hasLineContext(stackframe: StackframeType): stackframe is StackframeWithLineContext {
  return Object.hasOwn(stackframe.line ?? {}, 'context') || false;
}
