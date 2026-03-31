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
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import { useSkill } from '../../../hooks/skills/use_skills';
import { DetailRow } from '../common/detail_row';
import { DetailPanelLayout } from '../common/detail_panel_layout';
import { RenderSkillContentReadOnly } from '../common/render_skill_content_read_only';
import { ToolReadOnlyFlyout } from '../tools/tool_readonly_flyout';

interface SkillDetailPanelProps {
  skillId: string;
  onEdit: () => void;
  onRemove: () => void;
  isReadOnly?: boolean;
}

export const SkillDetailPanel: React.FC<SkillDetailPanelProps> = ({
  skillId,
  onEdit,
  onRemove,
  isReadOnly = false,
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
        showAutoIcon={isReadOnly}
        headerContent={
          <>
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.xs};
              `}
            >
              {skill?.id}
            </EuiText>
            <EuiText
              size="s"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
            >
              {skill?.description}
            </EuiText>
          </>
        }
        headerActions={(openConfirmRemove) =>
          isReadOnly ? (
            <EuiBadge color="hollow">{labels.agentSkills.autoIncludedBadgeLabel}</EuiBadge>
          ) : (
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {!skill?.readonly && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="pencil" size="xs" onClick={onEdit}>
                    {labels.skills.editSkillButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  size="xs"
                  color="danger"
                  onClick={openConfirmRemove}
                >
                  {labels.agentSkills.removeSkillButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
        confirmRemove={{
          title: labels.agentSkills.removeSkillConfirmTitle(skill?.name ?? skillId),
          body: labels.agentSkills.removeSkillConfirmBody,
          confirmButtonText: labels.agentSkills.removeSkillConfirmButton,
          cancelButtonText: labels.agentSkills.removeSkillCancelButton,
          onConfirm: onRemove,
        }}
      >
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <div
            css={css`
              padding: ${euiTheme.size.m};
            `}
          >
            <RenderSkillContentReadOnly content={skill?.content ?? ''} />
          </div>
          {skill?.tool_ids && skill.tool_ids.length > 0 && (
            <DetailRow label={labels.skills.toolsLabel} isLast>
              <EuiFlexGroup direction="column" gutterSize="xs">
                {skill.tool_ids.map((toolId) => (
                  <EuiFlexItem key={toolId} grow={false}>
                    <EuiLink onClick={() => setSelectedToolId(toolId)}>{toolId}</EuiLink>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </DetailRow>
          )}
        </div>
      </DetailPanelLayout>
      {selectedToolId && (
        <ToolReadOnlyFlyout toolId={selectedToolId} onClose={() => setSelectedToolId(null)} />
      )}
    </>
  );
};
