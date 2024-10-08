/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { isEmpty } from 'lodash/fp';
import { euiThemeVars } from '@kbn/ui-theme';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { EMPTY_PROMPT } from './translations';

const Strong = styled.strong`
  margin-right: ${euiThemeVars.euiSizeS};
`;

interface GetOptionFromPromptProps extends PromptResponse {
  content: string;
  id: string;
  name: string;
}

export const getOptionFromPrompt = ({
  content,
  id,
  name,
}: GetOptionFromPromptProps): EuiSuperSelectOption<string> => ({
  value: id,
  inputDisplay: (
    <span
      data-test-subj="systemPromptText"
      // @ts-ignore
      css={css`
        color: ${euiThemeVars.euiColorDarkestShade};
      `}
    >
      {name}
    </span>
  ),
  dropdownDisplay: (
    <>
      <Strong data-test-subj={`systemPrompt-${name}`}>{name}</Strong>

      {/* Empty content tooltip gets around :hover styles from SuperSelectOptionButton */}
      <EuiToolTip content={undefined}>
        <EuiText color="subdued" data-test-subj="content" size="s">
          {isEmpty(content) ? <p>{EMPTY_PROMPT}</p> : <p>{content}</p>}
        </EuiText>
      </EuiToolTip>
    </>
  ),
});

export const getOptions = (
  prompts: PromptResponse[] | undefined
): Array<EuiSuperSelectOption<string>> => prompts?.map((p) => getOptionFromPrompt(p)) ?? [];
