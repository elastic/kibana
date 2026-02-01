/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getCurrentAppTitle } from '../../utils/get_current_app_title';

const options = ({ htmlId }: { htmlId: string }) => [
  {
    id: `${htmlId}_1`,
    label: '1',
    value: 1,
  },
  {
    id: `${htmlId}_2`,
    label: '2',
    value: 2,
  },
  {
    id: `${htmlId}_3`,
    label: '3',
    value: 3,
  },
  {
    id: `${htmlId}_4`,
    label: '4',
    value: 4,
  },
  {
    id: `${htmlId}_5`,
    label: '5',
    value: 5,
  },
];

interface Props {
  core: CoreStart;
  selectedCsatOptionId: string;
  handleChangeCsatOptionId: (optionId: string) => void;
}

export const CsatButtons = ({ core, selectedCsatOptionId, handleChangeCsatOptionId }: Props) => {
  const { euiTheme } = useEuiTheme();
  const basicButtonGroupPrefix = useGeneratedHtmlId({
    prefix: 'csat',
  });

  const appTitle = getCurrentAppTitle(core);

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
          options={options({ htmlId: basicButtonGroupPrefix })}
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
              {i18n.translate('feedback.body.csatButtons.notSatisfiedLabel', {
                defaultMessage: 'Very dissatisfied',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={rightLabelCss}>
            <EuiText size="xs">
              {i18n.translate('feedback.body.csatButtons.verySatisfiedLabel', {
                defaultMessage: 'Very satisfied',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
};
