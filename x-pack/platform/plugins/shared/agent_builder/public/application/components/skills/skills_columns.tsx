/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import React from 'react';
import { labels } from '../../utils/i18n';
import type { AesopSkillSuggestion } from './use_aesop_suggestions';

export const createSkillIdColumn = (options?: {
  onClick?: (skillId: string) => void;
}): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'id',
  name: labels.skills.skillIdLabel,
  sortable: true,
  width: '30%',
  render: (id: string, skill: PublicSkillSummary) => (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        {options?.onClick ? (
          <EuiLink
            onClick={() => options.onClick!(skill.id)}
            data-test-subj={`agentBuilderSkillLink-${skill.id}`}
          >
            <EuiText size="s">
              <strong>{skill.id}</strong>
            </EuiText>
          </EuiLink>
        ) : (
          <EuiText size="s">
            <strong>{id}</strong>
          </EuiText>
        )}
      </EuiFlexItem>
      {skill.name !== skill.id && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {skill.name}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ),
});

export const createSkillDescriptionColumn = (): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'description',
  name: labels.skills.descriptionLabel,
  truncateText: true,
  width: '40%',
});

export const createSkillTypeColumn = (): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'readonly',
  name: labels.skills.typeLabel,
  width: '100px',
  render: (readonly: boolean) => (
    <EuiBadge color={readonly ? 'hollow' : 'primary'}>
      {readonly ? labels.skills.builtinLabel : labels.skills.customLabel}
    </EuiBadge>
  ),
});

export const createAesopSuggestionColumn = ({
  suggestionsBySkillId,
  onNavigateToSkill,
}: {
  suggestionsBySkillId: Map<string, AesopSkillSuggestion>;
  onNavigateToSkill?: (skillId: string) => void;
}): EuiBasicTableColumn<PublicSkillSummary> => ({
  name: i18n.translate('xpack.agentBuilder.skills.columns.aesopSuggestions', {
    defaultMessage: 'AESOP',
  }),
  width: '60px',
  align: 'center' as const,
  render: (skill: PublicSkillSummary) => {
    const suggestion = suggestionsBySkillId.get(skill.id);
    if (!suggestion) return null;

    const scorePercent = suggestion.validationScore
      ? `${(suggestion.validationScore * 100).toFixed(0)}%`
      : undefined;

    const tooltipContent = scorePercent
      ? i18n.translate('xpack.agentBuilder.skills.aesop.tooltipWithScore', {
          defaultMessage:
            'AESOP improvement available (confidence: {confidence}%, validation: {score}). Click to review.',
          values: {
            confidence: (suggestion.confidence * 100).toFixed(0),
            score: scorePercent,
          },
        })
      : i18n.translate('xpack.agentBuilder.skills.aesop.tooltipPending', {
          defaultMessage:
            'AESOP improvement available (confidence: {confidence}%). Click to review.',
          values: {
            confidence: (suggestion.confidence * 100).toFixed(0),
          },
        });

    const iconColor =
      suggestion.validationStatus === 'passed'
        ? 'success'
        : suggestion.validationStatus === 'failed'
        ? 'danger'
        : 'warning';

    if (onNavigateToSkill) {
      return (
        <EuiToolTip content={tooltipContent}>
          <EuiLink
            onClick={() => onNavigateToSkill(skill.id)}
            data-test-subj={`aesopLink-${skill.id}`}
          >
            <EuiIcon type="sparkles" color={iconColor} />
          </EuiLink>
        </EuiToolTip>
      );
    }

    return (
      <EuiToolTip content={tooltipContent}>
        <EuiIcon type="sparkles" color={iconColor} data-test-subj={`aesopIcon-${skill.id}`} />
      </EuiToolTip>
    );
  },
});
