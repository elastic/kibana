/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiBadge, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Evaluator } from './types';

interface SelectionSummaryProps {
  selectedEvaluators: Evaluator[];
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({ selectedEvaluators }) => {
  const { euiTheme } = useEuiTheme();

  const summaryStyles = css`
    border-top: ${euiTheme.border.thin};
    padding-top: ${euiTheme.size.m};
  `;

  const badgeStyles = css`
    margin-right: ${euiTheme.size.xs};
    margin-bottom: ${euiTheme.size.xs};
  `;

  if (selectedEvaluators.length === 0) {
    return (
      <div css={summaryStyles}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.onechat.evaluations.noEvaluatorsSelected', {
            defaultMessage: 'No evaluators selected',
          })}
        </EuiText>
      </div>
    );
  }

  return (
    <div css={summaryStyles}>
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.onechat.evaluations.selectionSummary', {
            defaultMessage: 'Selection Summary',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="m">
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.onechat.evaluations.selectedEvaluators', {
              defaultMessage: 'Selected Evaluators',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="s" />

        <div>
          {selectedEvaluators.map((evaluator) => (
            <EuiBadge key={evaluator.id} color="primary" css={badgeStyles}>
              {evaluator.name}
            </EuiBadge>
          ))}
        </div>

        <EuiSpacer size="m" />
      </EuiPanel>
    </div>
  );
};
