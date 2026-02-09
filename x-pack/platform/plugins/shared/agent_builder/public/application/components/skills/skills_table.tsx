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
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useDeleteSkill } from '../../hooks/skills/use_delete_skill';
import { useSkillsService } from '../../hooks/skills/use_skills';
import { useNavigation } from '../../hooks/use_navigation';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { SkillContextMenu } from './skills_table_context_menu';

export const AgentBuilderSkillsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const { skills, isLoading: isLoadingSkills, error: skillsError } = useSkillsService();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeleting,
    skillId: deleteSkillId,
    deleteSkill,
    confirmDelete,
    cancelDelete,
  } = useDeleteSkill();

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
        onTableChange={({ page }: CriteriaWithPagination<PublicSkillDefinition>) => {
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
            field: 'id',
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
          title={labels.skills.deleteSkillTitle(deleteSkillId)}
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
    </>
  );
});

const useSkillsTableColumns = ({
  onDelete,
}: {
  onDelete: (skillId: string) => void;
}): Array<EuiBasicTableColumn<PublicSkillDefinition>> => {
  const { manageTools } = useUiPrivileges();
  const { navigateToAgentBuilderUrl } = useNavigation();

  const handleSkillClick = useCallback(
    (skillId: string) => {
      navigateToAgentBuilderUrl(appPaths.skills.details({ skillId }));
    },
    [navigateToAgentBuilderUrl]
  );

  return useMemo(
    () => [
      {
        width: '30px',
        render: (skill: PublicSkillDefinition) => {
          if (skill.readonly) {
            return <EuiIconTip type="lock" content={labels.skills.readOnly} />;
          }
          return null;
        },
      },
      {
        field: 'id',
        name: labels.skills.skillIdLabel,
        sortable: true,
        width: '30%',
        render: (id: string, skill: PublicSkillDefinition) => (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiLink
                onClick={() => handleSkillClick(skill.id)}
                data-test-subj={`agentBuilderSkillLink-${skill.id}`}
              >
                <EuiText size="s">
                  <strong>{skill.id}</strong>
                </EuiText>
              </EuiLink>
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
      },
      {
        field: 'description',
        name: labels.skills.descriptionLabel,
        truncateText: true,
        width: '40%',
        render: (description: string) => (
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
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
        width: '80px',
        render: (toolIds: string[] | undefined) => (
          <EuiText size="xs" color="subdued">
            {toolIds?.length ?? 0}
          </EuiText>
        ),
      },
      {
        width: '60px',
        align: 'right',
        render: (skill: PublicSkillDefinition) => (
          <SkillContextMenu skill={skill} onDelete={onDelete} canManage={manageTools} />
        ),
      },
    ],
    [manageTools, handleSkillClick, onDelete]
  );
};
