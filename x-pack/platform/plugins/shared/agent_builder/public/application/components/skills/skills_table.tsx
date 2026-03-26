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
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useDeleteSkill } from '../../hooks/skills/use_delete_skill';
import { useSkillsService } from '../../hooks/skills/use_skills';
import { useNavigation } from '../../hooks/use_navigation';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { createSkillIdColumn, createSkillTypeColumn } from './skills_columns';
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
      createSkillIdColumn({ onClick: handleSkillClick }),
      {
        field: 'description',
        name: labels.skills.descriptionLabel,
        truncateText: true,
        width: '40%',
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
      createSkillTypeColumn(),
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
        field: 'referenced_content_count',
        name: labels.skills.referencedContentLabel,
        width: '80px',
        render: (count: number) => (
          <EuiText size="xs" color="subdued">
            {count}
          </EuiText>
        ),
      },
      {
        width: '60px',
        align: 'right' as const,
        render: (skill: PublicSkillSummary) => (
          <SkillContextMenu skill={skill} onDelete={onDelete} canManage={manageSkills} />
        ),
      },
    ],
    [manageSkills, handleSkillClick, onDelete]
  );
};
