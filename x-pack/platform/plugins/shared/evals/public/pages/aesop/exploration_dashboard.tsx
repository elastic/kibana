/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Exploration Dashboard
 *
 * Real-time monitoring of self-exploration workflows:
 * - Active explorations (in-progress)
 * - Exploration history (completed runs)
 * - Discovery metrics (indices, relationships, patterns found)
 * - Trigger new exploration
 *
 * Production features:
 * - Real-time updates (polling every 5s)
 * - Error handling and retry
 * - Performance metrics visualization
 */

import React, { useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiBasicTable,
  EuiButton,
  EuiHealth,
  EuiSpacer,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiFieldNumber,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiProgress,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEvalsApi } from '../../hooks/use_evals_api';

interface ExplorationRun {
  execution_id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  agent_role: string;
  indices_discovered?: number;
  relationships_found?: number;
  patterns_identified?: number;
  skills_proposed?: number;
  error_message?: string;
}

export const ExplorationDashboard = () => {
  const api = useEvalsApi();
  const queryClient = useQueryClient();

  const [agentRole, setAgentRole] = useState('SOC analyst');
  const [scopedIndices, setScopedIndices] = useState([
    { label: '.alerts-security.alerts-*' },
    { label: '.siem-signals-*' },
    { label: 'logs-endpoint.*' },
  ]);
  const [explorationDepth, setExplorationDepth] = useState(100);
  const [minPatternFreq, setMinPatternFreq] = useState(10);

  // Fetch active + recent explorations
  const { data: explorations, isLoading, error } = useQuery({
    queryKey: ['aesop', 'explorations'],
    queryFn: async () => {
      // Query workflow executions
      const response = await api.http.get('/internal/aesop/exploration/history', {
        query: { limit: 20 },
      });
      return response as { explorations: ExplorationRun[] };
    },
    refetchInterval: 5000, // Poll every 5s for real-time updates
  });

  // Trigger exploration mutation
  const triggerExploration = useMutation({
    mutationFn: async () => {
      return await api.http.post('/internal/aesop/exploration/run', {
        body: {
          agent_role: agentRole,
          scoped_indices: scopedIndices.map((i) => i.label),
          exploration_depth: explorationDepth,
          min_pattern_frequency: minPatternFreq,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'explorations'] });
    },
  });

  const activeExplorations = explorations?.explorations.filter((e) => e.status === 'running') || [];
  const completedExplorations = explorations?.explorations.filter((e) => e.status === 'completed') || [];
  const failedExplorations = explorations?.explorations.filter((e) => e.status === 'failed') || [];

  const columns = [
    {
      field: 'started_at',
      name: 'Started',
      width: '15%',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      field: 'agent_role',
      name: 'Role',
      width: '12%',
    },
    {
      field: 'status',
      name: 'Status',
      width: '12%',
      render: (status: string, run: ExplorationRun) => {
        const config = {
          running: { color: 'primary', label: 'Running...' },
          completed: { color: 'success', label: 'Complete' },
          failed: { color: 'danger', label: 'Failed' },
        };
        const c = config[status as keyof typeof config];
        return (
          <>
            <EuiHealth color={c.color}>{c.label}</EuiHealth>
            {status === 'running' && run.indices_discovered && (
              <EuiProgress size="xs" color="primary" style={{ marginTop: 4 }} />
            )}
          </>
        );
      },
    },
    {
      field: 'indices_discovered',
      name: 'Indices',
      width: '8%',
      render: (count?: number) => count || '-',
    },
    {
      field: 'relationships_found',
      name: 'Relationships',
      width: '10%',
      render: (count?: number) => count || '-',
    },
    {
      field: 'patterns_identified',
      name: 'Patterns',
      width: '8%',
      render: (count?: number) => count || '-',
    },
    {
      field: 'skills_proposed',
      name: 'Skills',
      width: '8%',
      render: (count?: number) =>
        count ? <EuiBadge color="success">{count}</EuiBadge> : '-',
    },
    {
      field: 'completed_at',
      name: 'Duration',
      width: '10%',
      render: (completed?: string, run?: ExplorationRun) => {
        if (!completed || !run) return '-';
        const duration = new Date(completed).getTime() - new Date(run.started_at).getTime();
        const minutes = Math.floor(duration / 60000);
        return `${minutes}m`;
      },
    },
    {
      name: 'Actions',
      width: '12%',
      render: (run: ExplorationRun) => (
        <EuiButton size="s" onClick={() => viewDetails(run.execution_id)}>
          View
        </EuiButton>
      ),
    },
  ];

  const viewDetails = (executionId: string) => {
    // TODO: Navigate to execution details page
    console.log('View execution:', executionId);
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="AESOP: Self-Exploration Dashboard"
          description="Monitor autonomous exploration workflows and discovered patterns"
        />

        <EuiSpacer />

        {/* Summary Stats */}
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={activeExplorations.length}
                description="Active Explorations"
                titleColor="primary"
                isLoading={activeExplorations.length > 0}
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={completedExplorations.length}
                description="Completed"
                titleColor="success"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={completedExplorations.reduce((sum, e) => sum + (e.skills_proposed || 0), 0)}
                description="Skills Proposed"
                titleColor="accent"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={failedExplorations.length}
                description="Failed"
                titleColor="danger"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        {/* Trigger New Exploration */}
        <EuiPanel>
          <EuiText><h3>Trigger New Exploration</h3></EuiText>
          <EuiSpacer size="m" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label="Agent Role">
                <EuiFieldText
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  placeholder="SOC analyst"
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFormRow label="Scoped Indices">
                <EuiComboBox
                  selectedOptions={scopedIndices}
                  onChange={setScopedIndices}
                  onCreateOption={(value) => setScopedIndices([...scopedIndices, { label: value }])}
                  placeholder="Enter index patterns"
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow label="Exploration Depth">
                <EuiFieldNumber
                  value={explorationDepth}
                  onChange={(e) => setExplorationDepth(parseInt(e.target.value) || 100)}
                  min={10}
                  max={1000}
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow label="Min Pattern Freq">
                <EuiFieldNumber
                  value={minPatternFreq}
                  onChange={(e) => setMinPatternFreq(parseInt(e.target.value) || 10)}
                  min={1}
                  max={100}
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false} style={{ justifyContent: 'flex-end', display: 'flex' }}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButton
                  fill
                  iconType="play"
                  onClick={() => triggerExploration.mutate()}
                  isLoading={triggerExploration.isPending}
                >
                  Start Exploration
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {triggerExploration.isSuccess && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title="Exploration started successfully"
                color="success"
                iconType="check"
              >
                <p>
                  Execution ID: {(triggerExploration.data as any).execution_id}
                  <br />
                  Estimated completion: ~15 minutes
                  <br />
                  Monitor progress below.
                </p>
              </EuiCallOut>
            </>
          )}

          {triggerExploration.isError && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title="Failed to start exploration"
                color="danger"
                iconType="error"
              >
                <p>{getErrorMessage(triggerExploration.error)}</p>
              </EuiCallOut>
            </>
          )}
        </EuiPanel>

        <EuiSpacer />

        {/* Exploration History */}
        <EuiPanel>
          <EuiText><h3>Exploration History</h3></EuiText>
          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiLoadingSpinner size="xl" />
          ) : error ? (
            <EuiCallOut title="Failed to load explorations" color="danger" iconType="error">
              {getErrorMessage(error)}
            </EuiCallOut>
          ) : explorations?.explorations.length === 0 ? (
            <EuiEmptyPrompt
              iconType="search"
              title={<h3>No explorations yet</h3>}
              body={<p>Trigger your first self-exploration to discover patterns and generate skills.</p>}
            />
          ) : (
            <EuiBasicTable
              items={explorations?.explorations || []}
              columns={columns}
              tableLayout="auto"
            />
          )}
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
