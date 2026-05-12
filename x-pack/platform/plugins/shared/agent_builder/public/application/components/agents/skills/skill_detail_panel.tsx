/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import { useSkill } from '../../../hooks/skills/use_skills';
import { DetailPanelLayout } from '../common/detail_panel_layout';
import { RenderMarkdownReadOnly } from '../common/render_markdown_read_only';
import { ToolReadOnlyFlyout } from '../tools/tool_readonly_flyout';
import { SkillTools } from './skill_tools';

interface SkillDetailPanelProps {
  skillId: string;
  onEdit: () => void;
  onRemove: () => void;
  isAutoIncluded: boolean;
  canEditAgent: boolean;
}

export const SkillDetailPanel: React.FC<SkillDetailPanelProps> = ({
  skillId,
  onEdit,
  onRemove,
  isAutoIncluded = false,
  canEditAgent,
}) => {
  const { euiTheme } = useEuiTheme();
  const { skill, isLoading } = useSkill({ skillId });
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  return (
    <>
      <DetailPanelLayout
        isLoading={isLoading}
        isEmpty={!skill}
        title={skill?.name ?? skillId}
        isReadOnly={skill?.readonly ?? false}
        headerContent={
          <>
            <EuiText
              size="s"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
            >
              {skill?.id}
            </EuiText>
            <EuiText
              size="s"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.l};
              `}
            >
              {skill?.description}
            </EuiText>
          </>
        }
        headerActions={(openConfirmRemove) => (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <SkillHeaderActions
              openConfirmRemove={openConfirmRemove}
              canEditAgent={canEditAgent}
              isAutoIncluded={isAutoIncluded}
              isReadOnly={skill?.readonly ?? false}
              onEdit={onEdit}
            />
          </EuiFlexGroup>
        )}
        confirmRemove={{
          title: labels.agentSkills.removeSkillConfirmTitle(skill?.name ?? skillId),
          body: labels.agentSkills.removeSkillConfirmBody,
          confirmButtonText: labels.agentSkills.removeSkillConfirmButton,
          cancelButtonText: labels.agentSkills.removeSkillCancelButton,
          onConfirm: onRemove,
        }}
      >
        <RenderMarkdownReadOnly
          label={labels.agentSkills.skillDetailInstructionsLabel}
          content={skill?.content ?? ''}
        />
        <SkillTools skillToolIds={skill?.tool_ids ?? []} onToolClick={setSelectedToolId} />
      </DetailPanelLayout>
      {selectedToolId && (
        <ToolReadOnlyFlyout toolId={selectedToolId} onClose={() => setSelectedToolId(null)} />
      )}
    </>
  );
};

const SkillHeaderActions = ({
  openConfirmRemove,
  canEditAgent,
  isAutoIncluded,
  isReadOnly,
  onEdit,
}: {
  openConfirmRemove: () => void;
  canEditAgent: boolean;
  isAutoIncluded: boolean;
  isReadOnly: boolean;
  onEdit: () => void;
}) => {
  if (isAutoIncluded) {
    return (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{labels.agentSkills.autoIncludedBadgeLabel}</EuiBadge>
      </EuiFlexItem>
    );
  }
  if (!canEditAgent) {
    return null;
  }

  return (
    <>
      {!isReadOnly && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="pencil" size="xs" onClick={onEdit}>
            {labels.skills.editSkillButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty iconType="cross" size="xs" color="danger" onClick={openConfirmRemove}>
          {labels.agentSkills.removeSkillButtonLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
};
