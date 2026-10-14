/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  CriteriaWithPagination,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { countBy } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import type { ListAgentResponseItem } from '../../../../../common/http_api/agents';
import { resolveOwnerLabel } from '../../../utils/owner';
import { useOwnerProfiles } from '../../../hooks/use_owner_profiles';
import { useDeleteAgent } from '../../../context/delete_agent_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentAiIndices } from '../../../hooks/ai_indices/use_agent_ai_indices';
import { useIsContextEngineEnabled } from '../../../hooks/use_is_context_engine_enabled';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { labels as i18nLabels } from '../../../utils/i18n';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import {
  useSetSpaceDefaultAgent,
  useSpaceDefaultAgent,
} from '../../../hooks/use_space_default_agent';
import { useToasts } from '../../../hooks/use_toasts';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';
import { Labels } from '../../common/labels';
import { AgentAvatar } from '../../common/agent_avatar';
import { AgentAiIndices } from './agent_ai_indices';
import { AiIndicesWarningsPanel } from '../ai_indices/ai_indices_warnings_panel';
import { AgentAccessControlModeBadge } from './agent_access_control_mode_badge';
import { AgentTypeBadge, isPreconfiguredAgentType } from './agent_type_badge';
import { AccessFlyout } from '../access/access_flyout';
import { accessSummaryManageButton } from '../access/access_i18n';

const renderOwnerCell = (
  owner: { id?: string; username?: string } | undefined,
  date?: string,
  profileMap?: Map<string, string>,
  dateFormat?: string
) => {
  const label = resolveOwnerLabel(owner, profileMap);
  const relativeDate = date ? moment(date).fromNow() : undefined;

  if (!label && !relativeDate) {
    return (
      <EuiText size="s" color="subdued">
        —
      </EuiText>
    );
  }

  if (!label) {
    return (
      <EuiText size="s" color="subdued">
        {relativeDate}
      </EuiText>
    );
  }

  if (!relativeDate) {
    return label;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={moment(date).format(dateFormat ?? 'LL LT')}>
          <EuiText size="xs" color="subdued" tabIndex={0}>
            {relativeDate}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const columnNames = {
  name: i18n.translate('xpack.agentBuilder.agents.nameColumn', { defaultMessage: 'Name' }),
  accessControlMode: i18n.translate('xpack.agentBuilder.agents.accessControlModeColumn', {
    defaultMessage: 'Access',
  }),
  labels: i18n.translate('xpack.agentBuilder.agents.labelsColumn', { defaultMessage: 'Labels' }),
  aiIndices: i18nLabels.aiIndices.columnTitle,
  createdBy: i18n.translate('xpack.agentBuilder.agents.createdByColumn', {
    defaultMessage: 'Created by',
  }),
  lastUpdatedBy: i18n.translate('xpack.agentBuilder.agents.lastUpdatedByColumn', {
    defaultMessage: 'Last updated by',
  }),
};

const actionLabels = {
  chat: i18n.translate('xpack.agentBuilder.agents.actions.chat', { defaultMessage: 'Chat' }),
  chatDescription: i18n.translate('xpack.agentBuilder.agents.actions.chatDescription', {
    defaultMessage: 'Chat with agent',
  }),
  edit: i18n.translate('xpack.agentBuilder.agents.actions.edit', { defaultMessage: 'Edit' }),
  editDescription: i18n.translate('xpack.agentBuilder.agents.actions.editDescription', {
    defaultMessage: 'Edit agent',
  }),
  clone: i18n.translate('xpack.agentBuilder.agents.actions.clone', { defaultMessage: 'Clone' }),
  cloneDescription: i18n.translate('xpack.agentBuilder.agents.actions.cloneDescription', {
    defaultMessage: 'Clone agent',
  }),
  delete: i18n.translate('xpack.agentBuilder.agents.actions.delete', { defaultMessage: 'Delete' }),
  deleteDescription: i18n.translate('xpack.agentBuilder.agents.actions.deleteDescription', {
    defaultMessage: 'Delete agent',
  }),
  setSpaceDefault: i18n.translate('xpack.agentBuilder.agents.actions.setSpaceDefault', {
    defaultMessage: 'Set as space default',
  }),
  setSpaceDefaultDescription: i18n.translate(
    'xpack.agentBuilder.agents.actions.setSpaceDefaultDescription',
    { defaultMessage: 'Make this the default agent for users in this space' }
  ),
  clearSpaceDefault: i18n.translate('xpack.agentBuilder.agents.actions.clearSpaceDefault', {
    defaultMessage: 'Remove as space default',
  }),
  clearSpaceDefaultDescription: i18n.translate(
    'xpack.agentBuilder.agents.actions.clearSpaceDefaultDescription',
    { defaultMessage: 'Users in this space will no longer be pinned to this agent' }
  ),
};

const spaceDefaultBadgeLabel = i18n.translate('xpack.agentBuilder.agents.spaceDefaultBadge', {
  defaultMessage: 'Space default',
});

const spaceDefaultBadgeTooltip = i18n.translate(
  'xpack.agentBuilder.agents.spaceDefaultBadgeTooltip',
  {
    defaultMessage:
      'This agent is assigned as the default for this space. Users without agent-management privileges are restricted to it when they open Agent Builder here.',
  }
);

export const AgentsList: React.FC = () => {
  const { agents, isLoading, error } = useAgentBuilderAgents();
  const profileMap = useOwnerProfiles(agents ?? []);
  const isContextEngineEnabled = useIsContextEngineEnabled();
  const {
    aiIndicesByAgentId,
    warnings: aiIndicesWarnings,
    isLoading: isLoadingAgentAiIndices,
    error: aiIndicesError,
  } = useAgentAiIndices({
    enabled: isContextEngineEnabled,
  });
  const { createAgentBuilderUrl } = useNavigation();
  const { deleteAgent } = useDeleteAgent();
  const { manageAgents } = useUiPrivileges();
  const { addSuccessToast, addErrorToast } = useToasts();
  const {
    services: { settings },
  } = useKibana();
  const dateFormat = settings?.client.get<string>('dateFormat');
  const { defaultAgentId: spaceDefaultAgentId } = useSpaceDefaultAgent();
  const setSpaceDefaultAgent = useSetSpaceDefaultAgent({
    onSuccess: (defaultAgentId) => {
      addSuccessToast({
        title:
          defaultAgentId === null
            ? i18n.translate('xpack.agentBuilder.agents.spaceDefaultClearedToast', {
                defaultMessage: 'Space default agent removed',
              })
            : i18n.translate('xpack.agentBuilder.agents.spaceDefaultSetToast', {
                defaultMessage: 'Space default agent updated',
              }),
      });
    },
    onError: (err: Error & { body?: { message?: string } }) => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.agents.spaceDefaultErrorToast', {
          defaultMessage: 'Failed to update the space default agent',
        }),
        text: err.body?.message ?? err.message,
      });
    },
  });
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [aclAgent, setAclAgent] = React.useState<ListAgentResponseItem | null>(null);

  const canManageAgentAccess = React.useCallback((agent: ListAgentResponseItem) => {
    return agent.permissions.update_access_control;
  }, []);

  const columns: Array<EuiBasicTableColumn<ListAgentResponseItem>> = useMemo(() => {
    const agentAvatar: EuiTableComputedColumnType<ListAgentResponseItem> = {
      width: '40px',
      align: 'center',
      valign: 'top',
      render: (agent) => <AgentAvatar agent={agent} size="m" />,
      'data-test-subj': 'agentBuilderAgentsListAvatar',
    };
    const canEditAgent = (agent: ListAgentResponseItem) => agent.permissions.update_agent;

    const agentNameAndDescription: EuiTableFieldDataColumnType<ListAgentResponseItem> = {
      width: '30%',
      field: 'name',
      name: columnNames.name,
      valign: 'top',
      render: (name: string, agent: ListAgentResponseItem) => {
        const canEdit = canEditAgent(agent);
        const nameContent = !canEdit ? (
          <EuiText data-test-subj="agentBuilderAgentsListName" size="m">
            {name}
          </EuiText>
        ) : (
          <EuiLink
            data-test-subj="agentBuilderAgentsListName"
            href={createAgentBuilderUrl(appPaths.agents.edit({ agentId: agent.id }))}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.agentList.AGENT_EDIT,
              detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
            })}
          >
            <EuiText size="m">{name}</EuiText>
          </EuiLink>
        );
        const isSpaceDefault = spaceDefaultAgentId === agent.id;
        return (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>{nameContent}</EuiFlexItem>
                {isPreconfiguredAgentType(agent.type) && (
                  <EuiFlexItem grow={false}>
                    <AgentTypeBadge agentType={agent.type} />
                  </EuiFlexItem>
                )}
                {isSpaceDefault && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip position="top" content={spaceDefaultBadgeTooltip}>
                      <EuiBadge
                        color="hollow"
                        iconType="starFill"
                        tabIndex={0}
                        data-test-subj="agentBuilderAgentsListSpaceDefaultBadge"
                      >
                        {spaceDefaultBadgeLabel}
                      </EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                <EuiTextBlockTruncate lines={2}>{agent.description}</EuiTextBlockTruncate>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      'data-test-subj': 'agentBuilderAgentsListNameAndDescription',
    };

    const agentLabels: EuiTableFieldDataColumnType<ListAgentResponseItem> = {
      width: '16%',
      valign: 'top',
      field: 'labels',
      name: columnNames.labels,
      render: (labels?: string[]) => {
        if (!labels) {
          return null;
        }

        return <Labels labels={labels} />;
      },
      'data-test-subj': 'agentBuilderAgentsListLabels',
    };

    const agentAiIndices: EuiTableComputedColumnType<ListAgentResponseItem> = {
      width: '14%',
      valign: 'top',
      name: columnNames.aiIndices,
      render: (agent) => {
        if (isLoadingAgentAiIndices) {
          return (
            <EuiSkeletonText lines={1} data-test-subj="agentBuilderAgentsListAiIndicesLoading" />
          );
        }
        if (aiIndicesError) {
          return (
            <EuiIconTip
              type="warning"
              color="danger"
              content={i18nLabels.aiIndices.loadErrorMessage}
              data-test-subj="agentBuilderAgentsListAiIndicesError"
            />
          );
        }

        return (
          <AgentAiIndices aiIndices={(aiIndicesByAgentId[agent.id] ?? []).map(({ id }) => id)} />
        );
      },
      'data-test-subj': 'agentBuilderAgentsListAiIndices',
    };

    const agentAccessControlMode: EuiTableComputedColumnType<ListAgentResponseItem> = {
      width: '110px',
      valign: 'top',
      name: columnNames.accessControlMode,
      render: (agent) => <AgentAccessControlModeBadge agent={agent} />,
      'data-test-subj': 'agentBuilderAgentsListAccessControlMode',
    };

    const agentCreatedBy: EuiTableFieldDataColumnType<ListAgentResponseItem> = {
      width: '11%',
      valign: 'top',
      field: 'created_by',
      name: columnNames.createdBy,
      render: (createdBy: ListAgentResponseItem['created_by'], agent: ListAgentResponseItem) =>
        renderOwnerCell(createdBy, agent.created_at, profileMap, dateFormat),
      'data-test-subj': 'agentBuilderAgentsListCreatedBy',
    };

    const agentLastUpdatedBy: EuiTableFieldDataColumnType<ListAgentResponseItem> = {
      width: '11%',
      valign: 'top',
      field: 'updated_by',
      name: columnNames.lastUpdatedBy,
      render: (updatedBy: ListAgentResponseItem['updated_by'], agent: ListAgentResponseItem) =>
        renderOwnerCell(updatedBy, agent.updated_at, profileMap, dateFormat),
      'data-test-subj': 'agentBuilderAgentsListLastUpdatedBy',
    };

    const agentActions: EuiTableActionsColumnType<ListAgentResponseItem> = {
      width: '100px',
      actions: [
        {
          type: 'icon',
          icon: 'comment',
          name: actionLabels.chat,
          description: actionLabels.chatDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListChat-${agent.id}`,
          isPrimary: true,
          showOnHover: true,
          href: (agent) =>
            createAgentBuilderUrl(appPaths.agent.conversations.new({ agentId: agent.id })),
        },
        {
          type: 'icon',
          icon: 'pencil',
          name: actionLabels.edit,
          description: actionLabels.editDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListEdit-${agent.id}`,
          isPrimary: true,
          showOnHover: true,
          href: (agent) => createAgentBuilderUrl(appPaths.agents.edit({ agentId: agent.id })),
          available: canEditAgent,
        },
        {
          type: 'icon',
          icon: 'copy',
          name: actionLabels.clone,
          description: actionLabels.cloneDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListClone-${agent.id}`,
          showOnHover: true,
          href: (agent) =>
            createAgentBuilderUrl(appPaths.agents.new, { [searchParamNames.sourceId]: agent.id }),
          available: () => manageAgents,
        },
        {
          type: 'icon',
          icon: 'lockOpen',
          name: accessSummaryManageButton,
          description: accessSummaryManageButton,
          'data-test-subj': (agent) => `agentBuilderAgentsListManageAccess-${agent.id}`,
          showOnHover: true,
          onClick: (agent) => setAclAgent(agent),
          available: canManageAgentAccess,
        },
        {
          type: 'icon',
          icon: (agent) => (spaceDefaultAgentId === agent.id ? 'starFilled' : 'starEmpty'),
          name: (agent) =>
            spaceDefaultAgentId === agent.id
              ? actionLabels.clearSpaceDefault
              : actionLabels.setSpaceDefault,
          description: (agent) =>
            spaceDefaultAgentId === agent.id
              ? actionLabels.clearSpaceDefaultDescription
              : actionLabels.setSpaceDefaultDescription,
          'data-test-subj': (agent) => `agentBuilderAgentsListSpaceDefault-${agent.id}`,
          showOnHover: true,
          available: () => manageAgents,
          onClick: (agent) => {
            const isCurrent = spaceDefaultAgentId === agent.id;
            setSpaceDefaultAgent.mutate(isCurrent ? null : agent.id);
          },
        },
        {
          // Have to use a custom action to display the danger color
          // Can use default action if this proposal is implemented: https://github.com/elastic/eui/discussions/8735
          render: (agent) => {
            return (
              <EuiToolTip position="right" content={actionLabels.deleteDescription}>
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                  <EuiIcon type="trash" color="danger" aria-hidden={true} />
                  <EuiLink
                    data-test-subj={`agentBuilderAgentsListDelete-${agent.id}`}
                    onClick={() => {
                      deleteAgent({ agent });
                    }}
                    color="danger"
                    {...getEbtProps({
                      element: AGENT_BUILDER_UI_EBT.element.pageContent,
                      action: AGENT_BUILDER_UI_EBT.action.agentList.AGENT_DELETE,
                      detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
                    })}
                  >
                    {actionLabels.delete}
                  </EuiLink>
                </EuiFlexGroup>
              </EuiToolTip>
            );
          },
          available: canEditAgent,
        },
      ],
    };

    return [
      agentAvatar,
      agentNameAndDescription,
      agentAccessControlMode,
      agentLabels,
      ...(isContextEngineEnabled ? [agentAiIndices] : []),
      agentCreatedBy,
      agentLastUpdatedBy,
      agentActions,
    ];
  }, [
    createAgentBuilderUrl,
    deleteAgent,
    manageAgents,
    canManageAgentAccess,
    isContextEngineEnabled,
    aiIndicesByAgentId,
    isLoadingAgentAiIndices,
    aiIndicesError,
    spaceDefaultAgentId,
    setSpaceDefaultAgent,
    profileMap,
    dateFormat,
  ]);

  const errorMessage = useMemo(
    () =>
      error
        ? i18n.translate('xpack.agentBuilder.agents.listErrorMessage', {
            defaultMessage: 'Failed to fetch agents',
          })
        : undefined,
    [error]
  );

  const labelOptions = useMemo(() => {
    const labels = agents.flatMap((agent) => agent.labels ?? []);
    const matchesByLabel = countBy(labels);
    const uniqueLabels = Object.keys(matchesByLabel);
    return uniqueLabels.map((label) => ({
      value: label,
      view: <FilterOptionWithMatchesBadge name={label} matches={matchesByLabel[label]} />,
    }));
  }, [agents]);

  return (
    <>
      {isContextEngineEnabled && aiIndicesWarnings && aiIndicesWarnings.length > 0 && (
        <>
          <AiIndicesWarningsPanel
            warnings={aiIndicesWarnings}
            data-test-subj="agentBuilderAgentsListAiIndicesWarnings"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.agentBuilder.agents.tableCaption', {
          defaultMessage: 'Agents',
        })}
        data-test-subj="agentBuilderAgentsListTable"
        rowProps={(row) => ({ 'data-test-subj': `agentBuilderAgentsListRow-${row.id}` })}
        items={agents}
        itemId={(agent) => agent.id}
        columns={columns}
        sorting={true}
        search={{
          box: { incremental: true },
          filters: [
            {
              type: 'field_value_selection',
              name: 'Labels',
              multiSelect: 'and',
              options: labelOptions,
              field: 'labels',
              operator: 'exact',
              autoSortOptions: false,
            },
          ],
        }}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        onTableChange={({ page }: CriteriaWithPagination<ListAgentResponseItem>) => {
          if (page) {
            setPageIndex(page.index);
            if (page.size !== pageSize) {
              setPageSize(page.size);
              setPageIndex(0);
            }
          }
        }}
        loading={isLoading}
        error={errorMessage}
        responsiveBreakpoint={false}
      />
      {aclAgent && <AccessFlyout agent={aclAgent} onClose={() => setAclAgent(null)} />}
    </>
  );
};
