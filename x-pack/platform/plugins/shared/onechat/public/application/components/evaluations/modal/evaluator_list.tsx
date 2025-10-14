/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiCheckbox, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Evaluator } from './types';

interface EvaluatorListProps {
  evaluators: Evaluator[];
  selectedEvaluators: Evaluator[];
  onEvaluatorSelect: (evaluator: Evaluator) => void;
  onEvaluatorToggle: (evaluator: Evaluator, isSelected: boolean) => void;
}

export const EvaluatorList: React.FC<EvaluatorListProps> = ({
  evaluators,
  selectedEvaluators,
  onEvaluatorSelect,
  onEvaluatorToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  const listStyles = css`
    height: 100%;
    overflow-y: auto;
    padding: ${euiTheme.size.s};
  `;

  const itemStyles = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
    cursor: pointer;
    transition: background-color ${euiTheme.animation.fast};
    border-radius: ${euiTheme.border.radius.small};
    margin-bottom: ${euiTheme.size.xs};

    &:hover {
      background-color: ${euiTheme.colors.lightestShade};
    }

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
  `;

  const checkboxStyles = css`
    margin-right: ${euiTheme.size.s};
  `;

  const isEvaluatorSelected = (evaluator: Evaluator) =>
    selectedEvaluators.some((selected) => selected.id === evaluator.id);

  return (
    <div css={listStyles}>
      <EuiText size="s" color="subdued">
        <strong>
          {i18n.translate('xpack.onechat.evaluations.availableEvaluators', {
            defaultMessage: 'Available Evaluators',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />

      {evaluators.map((evaluator) => {
        const isSelected = isEvaluatorSelected(evaluator);

        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div key={evaluator.id} css={itemStyles} onClick={() => onEvaluatorSelect(evaluator)}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <EuiCheckbox
                id={`evaluator-${evaluator.id}`}
                checked={isSelected}
                onChange={(e) => onEvaluatorToggle(evaluator, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                css={checkboxStyles}
                aria-label={`Select ${evaluator.name}`}
              />
              <div style={{ flex: 1 }}>
                <EuiText size="s">
                  <strong>{evaluator.name}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {evaluator.description}
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="accent">
                  Type: {evaluator.type}
                </EuiText>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
