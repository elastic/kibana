/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldNumber,
  EuiTextArea,
  EuiText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Evaluator } from './types';

interface EvaluatorDetailsProps {
  evaluator: Evaluator;
  customInstructions: string;
  onInstructionsChange: (instructions: string) => void;
}

export const EvaluatorDetails: React.FC<EvaluatorDetailsProps> = ({
  evaluator,
  customInstructions,
  onInstructionsChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const detailsStyles = css`
    height: 100%;
    overflow-y: auto;
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.m};
    background-color: ${euiTheme.colors.lightestShade};
    border-radius: ${euiTheme.border.radius.medium};
    margin-bottom: ${euiTheme.size.m};
  `;

  const renderInstructionsField = () => {
    if (evaluator.type === 'number') {
      return (
        <EuiFieldNumber
          value={customInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Enter threshold value (1-10)"
          min={1}
          max={10}
          step={1}
          fullWidth
        />
      );
    }

    return (
      <EuiTextArea
        value={customInstructions}
        onChange={(e) => onInstructionsChange(e.target.value)}
        placeholder="Enter custom instructions (optional)"
        rows={4}
        fullWidth
      />
    );
  };

  return (
    <div css={detailsStyles}>
      <div css={headerStyles}>
        <EuiText>
          <h3>{evaluator.name}</h3>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {evaluator.description}
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="accent">
          Type: {evaluator.type}
        </EuiText>
      </div>

      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.evaluations.customInstructions', {
            defaultMessage: 'Custom Instructions (Optional)',
          })}
          helpText={i18n.translate('xpack.onechat.evaluations.customInstructionsHelp', {
            defaultMessage:
              'Append information to the default instructions for this evaluator. Leave empty to use defaults.',
          })}
          fullWidth
        >
          {renderInstructionsField()}
        </EuiFormRow>
      </EuiForm>
    </div>
  );
};
