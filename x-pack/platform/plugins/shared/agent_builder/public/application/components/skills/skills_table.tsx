/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn, SearchFilterConfig } from '@elastic/eui';
import {
  EuiBadge,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useDeleteSkill } from '../../hooks/skills/use_delete_skill';
import { useSkillsService } from '../../hooks/skills/use_skills';
import { useNavigation } from '../../hooks/use_navigation';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { SkillContextMenu } from './skills_table_context_menu';

export const AgentBuilderSkillsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();
  const { skills, isLoading: isLoadingSkills, error: skillsError } = useSkillsService();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const hasFiredListViewRef = useRef(false);

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeleting,
    skillId: deleteSkillId,
    deleteSkill,
    confirmDelete,
    cancelDelete,
    usedByAgents,
    isForceConfirmModalOpen,
    confirmForceDelete,
    cancelForceDelete,
  } = useDeleteSkill();

  useEffect(() => {
    if (!isLoadingSkills && !hasFiredListViewRef.current) {
      hasFiredListViewRef.current = true;
      analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.ManageEntityListView, {
        entity_type: AGENT_BUILDER_UI_EBT.entity.SKILL,
        entity_count: skills.length,
      });
    }
  }, [isLoadingSkills, skills.length, analytics]);

  useEffect(() => {
    if (isForceConfirmModalOpen && usedByAgents) {
      analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UsedByWarningShown, {
        entity_type: AGENT_BUILDER_UI_EBT.entity.SKILL,
        agent_count: usedByAgents.agents.length,
      });
    }
  }, [isForceConfirmModalOpen, usedByAgents, analytics]);

  const handleConfirmForceDelete = useCallback(() => {
    if (usedByAgents) {
      analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UsedByWarningProceeded, {
        entity_type: AGENT_BUILDER_UI_EBT.entity.SKILL,
        agent_count: usedByAgents.agents.length,
      });
    }
    confirmForceDelete();
  }, [analytics, confirmForceDelete, usedByAgents]);

  const deleteSkillTitleId = useGeneratedHtmlId({ prefix: 'deleteSkillTitle' });
  const deleteSkillUsedByAgentsTitleId = useGeneratedHtmlId({
    prefix: 'deleteSkillUsedByMultipleAgentsTitle',
  });

  const columns = useSkillsTableColumns({ onDelete: deleteSkill });

  const searchConfig = useMemo(() => {
    const filters: SearchFilterConfig[] = [
      {
        type: 'field_value_selection',
        field: 'readonly',
        name: labels.skills.typeLabel,
        multiSelect: false,
        options: [
          { value: true, name: labels.skills.builtinLabel },
          { value: false, name: labels.skills.customLabel },
        ],
      },
    ];
    return {
      box: {
        incremental: true,
        placeholder: labels.skills.searchSkillsPlaceholder,
        'data-test-subj': 'agentBuilderSkillsTableSearchInput',
      },
      filters,
    };
  }, []);

  return (
    <>
      <EuiInMemoryTable
        tableCaption={labels.skills.skillsTableCaption(skills.length)}
        data-test-subj="agentBuilderSkillsTable"
        css={css`
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          table {
            background-color: transparent;
          }
        `}
        loading={isLoadingSkills}
        columns={columns}
        items={skills}
        itemId="id"
        error={skillsError ? labels.skills.listSkillsErrorMessage : undefined}
        search={searchConfig}
        onTableChange={({ page }: CriteriaWithPagination<PublicSkillSummary>) => {
          if (page) {
            setTablePageIndex(page.index);
            if (page.size !== tablePageSize) {
              setTablePageSize(page.size);
              setTablePageIndex(0);
            }
          }
        }}
        pagination={{
          pageIndex: tablePageIndex,
          pageSize: tablePageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        rowProps={(skill) => ({
          'data-test-subj': `agentBuilderSkillsTableRow-${skill.id}`,
        })}
        sorting={{
          sort: {
            field: 'name',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          isLoadingSkills ? (
            <EuiSkeletonText lines={1} />
          ) : (
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {skills.length > 0
                ? labels.skills.noSkillsMatchMessage
                : labels.skills.noSkillsMessage}
            </EuiText>
          )
        }
      />
      {isDeleteModalOpen && deleteSkillId && (
        <EuiConfirmModal
          title={labels.skills.deleteSkillTitle(
            skills.find((s) => s.id === deleteSkillId)?.name ?? deleteSkillId
          )}
          aria-labelledby={deleteSkillTitleId}
          titleProps={{ id: deleteSkillTitleId }}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          cancelButtonText={labels.skills.deleteSkillCancelButton}
          confirmButtonText={labels.skills.deleteSkillConfirmButton}
          buttonColor="danger"
          isLoading={isDeleting}
        >
          <p>{labels.skills.deleteSkillConfirmationText}</p>
        </EuiConfirmModal>
      )}
      {isForceConfirmModalOpen && usedByAgents && (
        <EuiConfirmModal
          title={labels.skills.deleteSkillUsedByAgentsTitle(
            skills.find((s) => s.id === usedByAgents.skillId)?.name ?? usedByAgents.skillId
          )}
          aria-labelledby={deleteSkillUsedByAgentsTitleId}
          titleProps={{ id: deleteSkillUsedByAgentsTitleId }}
          onCancel={cancelForceDelete}
          onConfirm={handleConfirmForceDelete}
          isLoading={isDeleting}
          cancelButtonText={labels.skills.deleteSkillUsedByAgentsCancelButton}
          confirmButtonText={labels.skills.deleteSkillUsedByAgentsConfirmButton}
          buttonColor="danger"
        >
          <EuiText>
            <p>{labels.skills.deleteSkillUsedByAgentsDescription}</p>
            {usedByAgents.agents.length > 0 && (
              <p>
                <strong>{labels.skills.deleteSkillUsedByAgentsAgentListLabel}:</strong>{' '}
                {labels.skills.deleteSkillUsedByAgentsAgentList(
                  usedByAgents.agents.map((a) => a.name ?? a.id)
                )}
              </p>
            )}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
});

const useSkillsTableColumns = ({
  onDelete,
}: {
  onDelete: (skillId: string) => void;
}): Array<EuiBasicTableColumn<PublicSkillSummary>> => {
  const { manageSkills } = useUiPrivileges();
  const { navigateToAgentBuilderUrl } = useNavigation();

  const handleSkillClick = useCallback(
    (skillId: string) => {
      navigateToAgentBuilderUrl(appPaths.skills.details({ skillId }));
    },
    [navigateToAgentBuilderUrl]
  );

  return useMemo(
    (): Array<EuiBasicTableColumn<PublicSkillSummary>> => [
      {
        width: '30px',
        render: (skill: PublicSkillSummary) => {
          if (skill.readonly) {
            return <EuiIconTip type="lock" content={labels.skills.readOnly} />;
          }
          return null;
        },
      },
      {
        field: 'name',
        name: labels.skills.nameLabel,
        sortable: true,
        width: '25%',
        render: (_name: string, skill: PublicSkillSummary) => (
          <EuiLink
            onClick={() => handleSkillClick(skill.id)}
            data-test-subj={`agentBuilderSkillLink-${skill.id}`}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.globalManagement.MANAGE_ENTITY_VIEW,
            })}
          >
            <EuiText size="s">
              <strong>{skill.name}</strong>
            </EuiText>
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: labels.skills.descriptionLabel,
        truncateText: true,
        width: 'auto',
        render: (description: string, skill: PublicSkillSummary) => (
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            {skill.experimental && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{labels.skills.experimentalLabel}</EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'readonly',
        name: labels.skills.typeLabel,
        width: '100px',
        render: (readonly: boolean) => (
          <EuiBadge color={readonly ? 'hollow' : 'primary'}>
            {readonly ? labels.skills.builtinLabel : labels.skills.customLabel}
          </EuiBadge>
        ),
      },
      {
        field: 'tool_ids',
        name: labels.skills.toolsLabel,
        width: '70px',
        render: (toolIds: string[] | undefined) => (
          <EuiText size="xs" color="subdued">
            {toolIds?.length ?? 0}
          </EuiText>
        ),
      },
      {
        field: 'referenced_content_count',
        name: labels.skills.referencedContentLabel,
        width: '70px',
        render: (count: number) => (
          <EuiText size="xs" color="subdued">
            {count}
          </EuiText>
        ),
      },
      {
        width: '50px',
        align: 'right' as const,
        render: (skill: PublicSkillSummary) => (
          <SkillContextMenu skill={skill} onDelete={onDelete} canManage={manageSkills} />
        ),
      },
    ],
    [manageSkills, handleSkillClick, onDelete]
  );
};
