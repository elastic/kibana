/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import type { Prompt } from '../../types';
import { EMPTY_PROMPT } from './translations';

const Strong = styled.strong`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

export const getOptionFromPrompt = ({
  content,
  id,
  name,
  showTitles = false,
}: Prompt & { showTitles?: boolean }): EuiSuperSelectOption<string> => ({
  value: id,
  inputDisplay: (
    <EuiText
      color="subdued"
      data-test-subj="systemPromptText"
      css={css`
        overflow: hidden;
        &:hover {
          cursor: pointer;
          text-decoration: underline;
        }
      `}
    >
      {showTitles ? name : content}
    </EuiText>
  ),
  dropdownDisplay: (
    <>
      <Strong data-test-subj="name">{name}</Strong>

      {/* Empty content tooltip gets around :hover styles from SuperSelectOptionButton */}
      <EuiToolTip content={undefined}>
        <EuiText color="subdued" data-test-subj="content" size="s">
          {isEmpty(content) ? <p>{EMPTY_PROMPT}</p> : <p>{content}</p>}
        </EuiText>
      </EuiToolTip>
    </>
  ),
});

interface GetOptionsProps {
  prompts: Prompt[] | undefined;
  showTitles?: boolean;
}
export const getOptions = ({
  prompts,
  showTitles = false,
}: GetOptionsProps): Array<EuiSuperSelectOption<string>> =>
  prompts?.map((p) => getOptionFromPrompt({ ...p, showTitles })) ?? [];
