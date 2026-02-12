/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiSelect,
  EuiButton,
  EuiFieldSearch,
  EuiBreadcrumbs,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AgentsTable } from '../../agents/agents_table';
import type { AgentSelection } from '../../agents/types';
import { FileTree } from './file_tree';
import { useCreateLiveQuery } from '../../live_queries/use_create_live_query_action';
import { getQueryForPath, PREDEFINED_QUERIES } from './predefined_queries';

interface FileBrowserProps {
  isInsideFlyout?: boolean;
  selectedAgentId?: string;
  onClose?: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  isInsideFlyout = false,
  selectedAgentId,
  onClose,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>(selectedAgentId || '');
  const [selectedQueryType, setSelectedQueryType] = useState<string>('basic_listing');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ text: string; href?: string }>>([
    { text: 'Root', href: '#' },
  ]);
  const [agentSelection, setAgentSelection] = useState<AgentSelection>({
    agents: selectedAgentId ? [selectedAgentId] : [],
    allAgentsSelected: false,
    platformsSelected: [],
    policiesSelected: [],
  });
  const [currentActionId, setCurrentActionId] = useState<string>('');

  // Create live query mutation
  const createLiveQueryMutation = useCreateLiveQuery({
    onSuccess: () => {
      // Query executed successfully
    },
  });

  // Execute live query when parameters change
  useEffect(() => {
    if (!selectedAgent || !selectedQueryType) {
      return;
    }

    const query = getQueryForPath(selectedQueryType, currentPath);
    const agentSelectionObj: AgentSelection = {
      agents: [selectedAgent],
      allAgentsSelected: false,
      platformsSelected: [],
      policiesSelected: [],
    };

    createLiveQueryMutation.mutate({
      query,
      agentSelection: agentSelectionObj,
    });
  }, [selectedAgent, selectedQueryType, currentPath]); // Removed createLiveQueryMutation from dependencies

  // Update action ID when live query completes
  useEffect(() => {
    if (createLiveQueryMutation.data?.queries?.[0]?.action_id) {
      setCurrentActionId(createLiveQueryMutation.data.queries[0].action_id);
    }
  }, [createLiveQueryMutation.data]);

  const queryOptions = useMemo(() => {
    return Object.entries(PREDEFINED_QUERIES).map(([key, query]) => ({
      value: key,
      text: query.name,
    }));
  }, []);

  const handleAgentSelection = useCallback((agent: AgentSelection) => {
    setAgentSelection(agent);
    setSelectedAgent(agent.agents[0] || '');
    setCurrentPath('/');
    setBreadcrumbs([{ text: 'Root', href: '#' }]);
    setCurrentActionId(''); // Reset action ID when agent changes
  }, []);

  const handleQueryTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQueryType(e.target.value);
    setCurrentActionId(''); // Reset action ID when query type changes
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handlePathNavigation = useCallback((path: string) => {
    setCurrentPath(path);
    setCurrentActionId(''); // Reset action ID when path changes
    // Update breadcrumbs based on path
    const pathParts = path.split('/').filter(Boolean);
    const newBreadcrumbs = [{ text: 'Root', href: '#' }];
    
    pathParts.forEach((part) => {
      newBreadcrumbs.push({ text: part, href: '#' });
    });
    
    setBreadcrumbs(newBreadcrumbs);
  }, []);

  const handleRefresh = useCallback(() => {
    setCurrentActionId(''); // Reset action ID to trigger re-execution
  }, []);

  const renderHeader = () => (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <h2>
            <EuiIcon type="folder" size="l" style={{ marginRight: '8px' }} />
            <FormattedMessage
              id="xpack.osquery.fileBrowser.title"
              defaultMessage="File System Browser"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      {isInsideFlyout && onClose && (
        <EuiFlexItem grow={false}>
          <EuiButton onClick={onClose} size="s">
            <FormattedMessage
              id="xpack.osquery.fileBrowser.closeButton"
              defaultMessage="Close"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const renderControls = () => (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiFlexItem grow={false} style={{ minWidth: '200px' }}>
        <EuiSelect
          id="queryType"
          options={queryOptions}
          value={selectedQueryType}
          onChange={handleQueryTypeChange}
          prepend="Query Type"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldSearch
          placeholder="Search files and directories..."
          value={searchTerm}
          onChange={handleSearchChange}
          isClearable={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={handleRefresh}
          iconType="refresh"
          disabled={!selectedAgent}
        >
          <FormattedMessage
            id="xpack.osquery.fileBrowser.refreshButton"
            defaultMessage="Refresh"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderBreadcrumbs = () => (
    <EuiBreadcrumbs
      breadcrumbs={breadcrumbs.map((crumb, index) => ({
        ...crumb,
        onClick: () => handlePathNavigation('/' + breadcrumbs.slice(0, index + 1).map(b => b.text).join('/')),
      }))}
      truncate={false}
      max={10}
    />
  );

  if (!selectedAgent && !isInsideFlyout) {
    return (
      <EuiPanel>
        {renderHeader()}
        <EuiSpacer size="l" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.osquery.fileBrowser.selectAgentMessage"
              defaultMessage="Select an agent to browse its file system:"
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <AgentsTable
          agentSelection={agentSelection}
          onChange={handleAgentSelection}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel>
      {renderHeader()}
      <EuiSpacer size="l" />
      
      {renderControls()}
      <EuiSpacer size="m" />
      
      {renderBreadcrumbs()}
      <EuiSpacer size="m" />

      <FileTree
        actionId={currentActionId} // Using actionId from live query execution
        agentIds={selectedAgent ? [selectedAgent] : []}
        onPathNavigation={handlePathNavigation}
      />
    </EuiPanel>
  );
};
