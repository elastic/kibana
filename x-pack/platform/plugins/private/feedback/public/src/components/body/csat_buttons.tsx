/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const options = [
  {
    id: '1',
    label: '1',
  },
  {
    id: '2',
    label: '2',
  },
  {
    id: '3',
    label: '3',
  },
  {
    id: '4',
    label: '4',
  },
  {
    id: '5',
    label: '5',
  },
];

interface Props {
  selectedCsatOptionId: string;
  appTitle?: string;
  handleChangeCsatOptionId: (optionId: string) => void;
}

export const CsatButtons = ({
  selectedCsatOptionId,
  appTitle,
  handleChangeCsatOptionId,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const labelsCss = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const rightLabelCss = css`
    text-align: right;
  `;

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('feedback.body.csatButtons.titleText', {
        defaultMessage: 'How would you rate your experience with {appTitle}?',
        values: {
          appTitle: appTitle ? appTitle : 'Elastic',
        },
      })}
    >
      <>
        <EuiButtonGroup
          options={options}
          legend={i18n.translate('feedback.body.csatButtons.legend', {
            defaultMessage: 'Customer satisfaction rating',
          })}
          type="single"
          onChange={handleChangeCsatOptionId}
          idSelected={selectedCsatOptionId}
          isFullWidth={true}
          buttonSize="compressed"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" css={labelsCss}>
          <EuiFlexItem>
            <EuiText size="xs">
              {i18n.translate('feedback.body.csatButtons.veryNegativeLabel', {
                defaultMessage: 'Very negative',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={rightLabelCss}>
            <EuiText size="xs">
              {i18n.translate('feedback.body.csatButtons.veryPositiveLabel', {
                defaultMessage: 'Very positive',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
};
