/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';
import { EuiAccordion } from '@elastic/eui';
import {
  IStackframe,
  IStackframeWithLineContext
} from '../../../../typings/es_schemas/raw/fields/Stackframe';
import {
  borderRadius,
  fontFamilyCode,
  fontSize
} from '../../../style/variables';
import { FrameHeading } from './FrameHeading';
import { Context } from './Context';
import { Variables } from './Variables';

const ContextContainer = styled.div<{ isLibraryFrame: boolean }>`
  position: relative;
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${borderRadius};
  background: ${props =>
    props.isLibraryFrame
      ? theme.euiColorEmptyShade
      : theme.euiColorLightestShade};
`;

interface Props {
  stackframe: IStackframe;
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
  isLibraryFrame = false
}: Props) {
  if (!hasLineContext(stackframe)) {
    return (
      <FrameHeading stackframe={stackframe} isLibraryFrame={isLibraryFrame} />
    );
  }

  return (
    <EuiAccordion
      buttonContent={
        <FrameHeading stackframe={stackframe} isLibraryFrame={isLibraryFrame} />
      }
      id={id}
      initialIsOpen={initialIsOpen}
    >
      <ContextContainer isLibraryFrame={isLibraryFrame}>
        <Context
          stackframe={stackframe}
          codeLanguage={codeLanguage}
          isLibraryFrame={isLibraryFrame}
        />
      </ContextContainer>
      <Variables vars={stackframe.vars} />
    </EuiAccordion>
  );
}

function hasLineContext(
  stackframe: IStackframe
): stackframe is IStackframeWithLineContext {
  return stackframe.line.hasOwnProperty('context');
}
