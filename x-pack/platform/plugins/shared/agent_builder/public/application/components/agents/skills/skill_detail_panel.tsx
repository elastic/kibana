/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import { useSkill } from '../../../hooks/skills/use_skills';

interface SkillDetailPanelProps {
  skillId: string;
  onEdit: () => void;
  onRemove: () => void;
  isReadOnly?: boolean;
}

interface SkillDetailRowProps {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SkillDetailRow: React.FC<SkillDetailRowProps> = ({ label, children, isLast = false }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.m};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
    >
      <EuiFlexItem
        grow={false}
        css={css`
          width: 180px;
          padding-right: ${euiTheme.size.m};
        `}
      >
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SkillDetailPanel: React.FC<SkillDetailPanelProps> = ({
  skillId,
  onEdit,
  onRemove,
  isReadOnly = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { skill, isLoading } = useSkill({ skillId });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          padding: ${euiTheme.size.xxl};
        `}
      >
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (!skill) return null;

  return (
    <div
      css={css`
        height: 100%;
        overflow-y: auto;
        padding: 0;
      `}
    >
      <div
        css={css`
          border: ${euiTheme.border.thin};
          overflow: hidden;
        `}
      >
        <div
          css={css`
            padding: ${euiTheme.size.m};
            border-bottom: ${euiTheme.border.thin};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{skill.name}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {!skill.readonly && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty iconType="pencil" size="xs" onClick={onEdit}>
                      {labels.skills.editSkillButtonLabel}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                {!isReadOnly && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="cross"
                      size="xs"
                      color="danger"
                      onClick={() => setIsConfirmOpen(true)}
                    >
                      {labels.agentSkills.removeSkillButtonLabel}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <SkillDetailRow label={labels.skills.skillIdLabel}>
            <EuiText size="s">{skill.id}</EuiText>
          </SkillDetailRow>
          <SkillDetailRow label={labels.skills.nameLabel}>
            <EuiText size="s">{skill.name}</EuiText>
          </SkillDetailRow>
          <SkillDetailRow label={labels.skills.descriptionLabel}>
            <EuiText size="s">{skill.description}</EuiText>
          </SkillDetailRow>
          <SkillDetailRow
            label={labels.agentSkills.skillDetailInstructionsLabel}
            isLast={!skill.tool_ids || skill.tool_ids.length === 0}
          >
            <div
              css={css`
                white-space: pre-wrap;
                word-break: break-word;
              `}
            >
              <EuiText size="s">{skill.content}</EuiText>
            </div>
          </SkillDetailRow>
          {skill.tool_ids && skill.tool_ids.length > 0 && (
            <SkillDetailRow label={labels.skills.toolsLabel} isLast>
              <EuiFlexGroup direction="column" gutterSize="xs">
                {skill.tool_ids.map((toolId) => (
                  <EuiFlexItem key={toolId} grow={false}>
                    <EuiText size="s" color="primary">
                      {toolId}
                    </EuiText>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </SkillDetailRow>
          )}
        </div>
      </div>
      {isConfirmOpen && (
        <EuiConfirmModal
          title={labels.agentSkills.removeSkillConfirmTitle(skill.name)}
          aria-label={labels.agentSkills.removeSkillConfirmTitle(skill.name)}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            onRemove();
          }}
          cancelButtonText={labels.agentSkills.removeSkillCancelButton}
          confirmButtonText={labels.agentSkills.removeSkillConfirmButton}
          buttonColor="danger"
        >
          <p>{labels.agentSkills.removeSkillConfirmBody}</p>
        </EuiConfirmModal>
      )}
    </div>
  );
};
