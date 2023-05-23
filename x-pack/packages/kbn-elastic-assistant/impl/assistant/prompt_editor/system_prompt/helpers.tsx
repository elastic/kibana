/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { css } from '@emotion/react';
import type { Prompt } from '../../types';

const Strong = styled.strong`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

export const getOptionFromPrompt = ({
  content,
  id,
  name,
}: Prompt): EuiSuperSelectOption<string> => ({
  value: id,
  inputDisplay: (
    <EuiText
      css={css`
        overflow: hidden;
      `}
      color="subdued"
    >
      {content}
    </EuiText>
  ),
  dropdownDisplay: (
    <>
      <Strong>{name}</Strong>

      <EuiToolTip content={content}>
        <EuiText size="s" color="subdued">
          <p>{content}</p>
        </EuiText>
      </EuiToolTip>
    </>
  ),
});

export const getOptions = (prompts: Prompt[]) => prompts.map(getOptionFromPrompt);
