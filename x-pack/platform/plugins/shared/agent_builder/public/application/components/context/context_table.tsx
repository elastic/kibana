/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AiIndexHttpItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { AgentDefinitionWithPermissions } from '../../../../common/http_api/agents';
import { useAgentBuilderAgents } from '../../hooks/agents/use_agents';
import { useCanUpdateAgent } from '../../hooks/agents/use_can_update_agent';
import { useAgentAiIndices } from '../../hooks/ai_indices/use_agent_ai_indices';
import { useInheritedAiIndices } from '../../hooks/ai_indices/use_inherited_ai_indices';
import { useListAiIndices } from '../../hooks/ai_indices/use_list_ai_indices';
import { getContextStatus } from '../../hooks/ai_indices/context_status';
import { labels } from '../../utils/i18n';
import { AiIndexSelector } from './ai_index_selector';
import { ContextStatusBadge } from './context_status_badge';

interface RetrievesFromCellProps {
  agent: AgentDefinitionWithPermissions;
  aiIndices: AiIndexHttpItem[];
  assignedIds: string[];
  inheritedIds: string[];
  onChange: (agent: AgentDefinitionWithPermissions, selectedIds: string[]) => void;
}

const RetrievesFromCell: React.FC<RetrievesFromCellProps> = ({
  agent,
  aiIndices,
  assignedIds,
  inheritedIds,
  onChange,
}) => {
  const canEditAgent = useCanUpdateAgent({ agent });

  const handleChange = useCallback(
    (selectedIds: string[]) => onChange(agent, selectedIds),
    [agent, onChange]
  );

  // An agent with neither assigned nor inherited AI indices never reaches the Context
  // Engine, so there is nothing to select for it.
  if (getContextStatus({ assigned: assignedIds, inherited: inheritedIds }) === 'off') {
    return (
      <EuiText size="s" color="subdued" data-test-subj="agentBuilderContextOffMessage">
        {labels.context.contextOffMessage}
      </EuiText>
    );
  }

  return (
    <AiIndexSelector
      agentName={agent.name}
      aiIndices={aiIndices}
      assignedIds={assignedIds}
      inheritedIds={inheritedIds}
      isDisabled={!canEditAgent}
      onChange={handleChange}
    />
  );
};

export const ContextTable: React.FC = () => {
  const { agents, isLoading: isLoadingAgents } = useAgentBuilderAgents();
  const { aiIndices, isLoading: isLoadingAiIndices, error: aiIndicesError } = useListAiIndices();
  const { inheritedAiIndicesByAgentId, isLoading: isLoadingInheritedAiIndices } =
    useInheritedAiIndices();
  const { setAiIndices } = useAgentAiIndices();

  // Until inherited indices land every agent looks like it has no AI indices at all, which
  // would render a column of "off" pills. Hold the rows back rather than show a wrong state.
  const isLoading = isLoadingAgents || isLoadingAiIndices || isLoadingInheritedAiIndices;

  const handleChange = useCallback(
    (agent: AgentDefinitionWithPermissions, selectedIds: string[]) => {
      setAiIndices({ agentId: agent.id, agentName: agent.name, aiIndices: selectedIds });
    },
    [setAiIndices]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<AgentDefinitionWithPermissions>>>(
    () => [
      {
        field: 'name',
        name: labels.context.columnAgent,
        render: (name: string, agent: AgentDefinitionWithPermissions) => (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiText size="s">
              <strong>{name}</strong>
            </EuiText>
            {agent.description ? (
              <EuiText size="xs" color="subdued">
                {agent.description}
              </EuiText>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        name: labels.context.columnContext,
        width: '120px',
        render: (agent: AgentDefinitionWithPermissions) => (
          <ContextStatusBadge
            status={getContextStatus({
              assigned: agent.configuration.ai_indices ?? [],
              inherited: inheritedAiIndicesByAgentId[agent.id] ?? [],
            })}
          />
        ),
      },
      {
        name: labels.context.columnRetrievesFrom,
        render: (agent: AgentDefinitionWithPermissions) => (
          <RetrievesFromCell
            agent={agent}
            aiIndices={aiIndices}
            assignedIds={agent.configuration.ai_indices ?? []}
            inheritedIds={inheritedAiIndicesByAgentId[agent.id] ?? []}
            onChange={handleChange}
          />
        ),
      },
    ],
    [aiIndices, inheritedAiIndicesByAgentId, handleChange]
  );

  return (
    <>
      {aiIndicesError ? (
        <KbnWarningCallout
          announceOnMount
          title={labels.context.aiIndicesLoadErrorMessage}
          data-test-subj="agentBuilderAiIndicesError"
        />
      ) : null}
      <EuiBasicTable
        items={isLoading ? [] : agents}
        columns={columns}
        loading={isLoading}
        noItemsMessage={labels.context.noAgentsMessage}
        tableCaption={labels.context.tableCaption}
        data-test-subj="agentBuilderContextTable"
      />
    </>
  );
};
