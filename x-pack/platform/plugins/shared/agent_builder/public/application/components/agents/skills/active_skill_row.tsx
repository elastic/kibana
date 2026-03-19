/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';

export interface ActiveSkillRowProps {
  skill: PublicSkillSummary;
  isSelected: boolean;
  onSelect: (skill: PublicSkillSummary) => void;
  onRemove: (skill: PublicSkillSummary) => void;
  isRemoving?: boolean;
  readOnly?: boolean;
}

export const ActiveSkillRow: React.FC<ActiveSkillRowProps> = ({
  skill,
  isSelected,
  onSelect,
  onRemove,
  isRemoving = false,
  readOnly = false,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      onClick={() => onSelect(skill)}
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        cursor: pointer;
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveHover
          : 'transparent'};
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
    >
      <EuiFlexItem>
        <EuiText
          size="s"
          css={css`
            font-weight: ${isSelected
              ? euiTheme.font.weight.semiBold
              : euiTheme.font.weight.regular};
          `}
        >
          {skill.name}
        </EuiText>
      </EuiFlexItem>
      {isSelected && (
        <EuiFlexItem grow={false}>
          {readOnly ? (
            <EuiBadge color="hollow">
              {labels.agentSkills.elasticCapabilitiesReadOnlyBadge}
            </EuiBadge>
          ) : (
            <EuiButtonIcon
              iconType="cross"
              aria-label={labels.agentSkills.removeSkillAriaLabel}
              disabled={isRemoving}
              onClick={(event) => {
                // Prevent row selection when clicking the remove control.
                event.stopPropagation();
                onRemove(skill);
              }}
            />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
