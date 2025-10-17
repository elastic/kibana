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
  selectedEvaluator: Evaluator | null;
  onEvaluatorSelect: (evaluator: Evaluator) => void;
  onEvaluatorToggle: (evaluator: Evaluator, isSelected: boolean) => void;
}

export const EvaluatorList: React.FC<EvaluatorListProps> = ({
  evaluators,
  selectedEvaluators,
  selectedEvaluator,
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
    padding: ${euiTheme.size.m};
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

  const activeItemStyles = css`
    background-color: ${euiTheme.colors.lightestShade};
    border-left: 3px solid ${euiTheme.colors.primary};

    &:hover {
      background-color: ${euiTheme.colors.lightestShade};
    }
  `;

  const checkboxStyles = css`
    margin-right: ${euiTheme.size.m};
  `;

  const isEvaluatorSelected = (evaluator: Evaluator) =>
    selectedEvaluators.some((selected) => selected.id === evaluator.id);

  const isEvaluatorActive = (evaluator: Evaluator) => selectedEvaluator?.id === evaluator.id;

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
        const isActive = isEvaluatorActive(evaluator);

        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            key={evaluator.id}
            css={[itemStyles, isActive && activeItemStyles]}
            onClick={() => onEvaluatorSelect(evaluator)}
          >
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
