/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import React, { PropsWithChildren } from 'react';
import { isEmpty } from 'lodash/fp';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { EMPTY_PROMPT } from './translations';

const Strong = (props: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();

  return (
    <strong
      css={css`
        margin-right: ${euiTheme.size.s};
      `}
    >
      {props.children}
    </strong>
  );
};

interface GetOptionFromPromptProps extends PromptResponse {
  content: string;
  id: string;
  name: string;
}

const InputDisplay = ({ name }: { name: string }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      data-test-subj="systemPromptText"
      css={css`
        color: ${euiTheme.colors.darkestShade};
      `}
    >
      {name}
    </span>
  );
};

export const getOptionFromPrompt = ({
  content,
  id,
  name,
}: GetOptionFromPromptProps): EuiSuperSelectOption<string> => ({
  value: id,
  inputDisplay: <InputDisplay name={name} />,
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
