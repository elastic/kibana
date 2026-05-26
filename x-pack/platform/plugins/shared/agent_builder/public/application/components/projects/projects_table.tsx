/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, SearchFilterConfig } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import type { Project } from '@kbn/agent-builder-common';
import { ProjectType } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { useProjects } from '../../hooks/projects/use_projects';
import { useKibana } from '../../hooks/use_kibana';
import { getCaseViewUrl } from '../../utils/get_case_view_url';
import { ProjectDetailsFlyout } from './project_details_flyout';

const formatDate = (value: string) => new Date(value).toLocaleString();

type ProjectTableItem = Project & { conversation_count: number };

export interface ProjectsTableProps {
  focusProjectId?: string | null;
  onFocusProjectHandled?: () => void;
}

export const ProjectsTable = ({
  focusProjectId,
  onFocusProjectHandled,
}: ProjectsTableProps) => {
  const {
    services: { application },
  } = useKibana();
  const { projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (focusProjectId) {
      setSelectedProjectId(focusProjectId);
      onFocusProjectHandled?.();
    }
  }, [focusProjectId, onFocusProjectHandled]);

  const tableItems = useMemo(
    (): ProjectTableItem[] =>
      projects.map((project) => ({
        ...project,
        conversation_count: project.conversation_ids.length,
      })),
    [projects]
  );

  const columns = useMemo((): Array<EuiBasicTableColumn<ProjectTableItem>> => {
    return [
      {
        field: 'title',
        name: i18n.translate('xpack.agentBuilder.projects.table.title', {
          defaultMessage: 'Title',
        }),
        render: (title: string, project: ProjectTableItem) => (
          <EuiButtonEmpty
            flush="left"
            size="s"
            onClick={() => setSelectedProjectId(project.id)}
            data-test-subj={`agentBuilderProjectTitle-${project.id}`}
          >
            {title}
          </EuiButtonEmpty>
        ),
        sortable: true,
      },
      {
        field: 'type',
        name: i18n.translate('xpack.agentBuilder.projects.table.type', {
          defaultMessage: 'Type',
        }),
        render: (type: ProjectType) => <EuiBadge>{type}</EuiBadge>,
        sortable: true,
      },
      {
        name: i18n.translate('xpack.agentBuilder.projects.table.case', {
          defaultMessage: 'Case',
        }),
        render: (project: ProjectTableItem) => {
          const caseRef = project.case_ref;
          if (!caseRef) {
            return <EuiText size="s" color="subdued">—</EuiText>;
          }
          const caseUrl = getCaseViewUrl({
            application,
            caseId: caseRef.case_id,
            owner: caseRef.owner,
          });
          if (caseUrl) {
            return (
              <EuiLink href={caseUrl} data-test-subj={`agentBuilderProjectCaseLink-${project.id}`}>
                {caseRef.case_id}
              </EuiLink>
            );
          }
          return <EuiText size="s">{caseRef.case_id}</EuiText>;
        },
      },
      {
        field: 'conversation_count',
        name: i18n.translate('xpack.agentBuilder.projects.table.conversations', {
          defaultMessage: 'Conversations',
        }),
        sortable: true,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.agentBuilder.projects.table.updated', {
          defaultMessage: 'Updated',
        }),
        render: formatDate,
        sortable: true,
      },
    ];
  }, [application]);

  const search = useMemo(() => {
    const filters: SearchFilterConfig[] = [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('xpack.agentBuilder.projects.table.typeFilter', {
          defaultMessage: 'Type',
        }),
        multiSelect: false,
        options: Object.values(ProjectType).map((type) => ({
          value: type,
          name: type,
        })),
      },
    ];
    return {
      box: {
        incremental: true,
        placeholder: i18n.translate('xpack.agentBuilder.projects.table.searchPlaceholder', {
          defaultMessage: 'Search projects',
        }),
        'data-test-subj': 'agentBuilderProjectsTableSearch',
      },
      filters,
    };
  }, []);

  if (isLoading) {
    return <EuiSkeletonText lines={6} />;
  }

  return (
    <>
      <EuiInMemoryTable
        items={tableItems}
        columns={columns}
        itemId="id"
        search={search}
        sorting={{ sort: { field: 'updated_at', direction: 'desc' } }}
        data-test-subj="agentBuilderProjectsTable"
      />
      <ProjectDetailsFlyout
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />
    </>
  );
};
