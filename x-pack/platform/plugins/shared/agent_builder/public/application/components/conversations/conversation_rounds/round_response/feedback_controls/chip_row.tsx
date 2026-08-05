/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const DOWN_CHIPS = [
  i18n.translate('xpack.agentBuilder.feedback.chip.inaccurate', {
    defaultMessage: 'Inaccurate',
  }),
  i18n.translate('xpack.agentBuilder.feedback.chip.incomplete', {
    defaultMessage: 'Incomplete',
  }),
  i18n.translate('xpack.agentBuilder.feedback.chip.didntFollowInstructions', {
    defaultMessage: "Didn't follow instructions",
  }),
  i18n.translate('xpack.agentBuilder.feedback.chip.other', { defaultMessage: 'Other' }),
];

const UP_CHIPS = [
  i18n.translate('xpack.agentBuilder.feedback.chip.accurate', { defaultMessage: 'Accurate' }),
  i18n.translate('xpack.agentBuilder.feedback.chip.useful', { defaultMessage: 'Useful' }),
  i18n.translate('xpack.agentBuilder.feedback.chip.wellExplained', {
    defaultMessage: 'Well-explained',
  }),
];

interface ChipRowProps {
  vote: 'up' | 'down';
  selected: string[];
  onToggle: (chip: string) => void;
}

export const ChipRow: React.FC<ChipRowProps> = ({ vote, selected, onToggle }) => {
  const { euiTheme } = useEuiTheme();
  const chips = vote === 'down' ? DOWN_CHIPS : UP_CHIPS;

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {chips.map((chip) => {
        const isSelected = selected.includes(chip);
        return (
          <EuiFlexItem key={chip} grow={false}>
            <button
              type="button"
              onClick={() => onToggle(chip)}
              css={css`
                padding: 2px 10px;
                border-radius: ${euiTheme.border.radius.medium};
                border: 1px solid ${isSelected ? euiTheme.colors.primary : euiTheme.border.color};
                background: ${isSelected ? euiTheme.colors.lightestShade : 'transparent'};
                color: ${isSelected ? euiTheme.colors.primary : euiTheme.colors.text};
                cursor: pointer;
                font-size: ${euiTheme.font.scale.xs}${euiTheme.font.defaultUnits};
                line-height: 20px;
                transition: border-color 0.15s ease, background 0.15s ease;
                &:hover {
                  border-color: ${euiTheme.colors.primary};
                }
              `}
            >
              {chip}
            </button>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
