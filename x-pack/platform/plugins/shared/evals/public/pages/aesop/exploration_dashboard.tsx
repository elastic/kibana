/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  EuiCallOut,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiProgress,
  EuiText,
  EuiBadge,
  EuiSteps,
  EuiFieldText,
  EuiFieldNumber,
  EuiFormRow,
  EuiRadioGroup,
  EuiComboBox,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useHistory } from 'react-router-dom';
import { useEvalsApi } from '../../hooks/use_evals_api';
import { ExplorationProgress } from './components/exploration_progress';

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

const DEFAULT_AGENT_ROLE = 'SOC analyst';
const DEFAULT_EXPLORATION_DEPTH = 100;
const DEFAULT_MIN_PATTERN_FREQUENCY = 10;
const DEFAULT_SCOPED_INDICES = ['.alerts-security.alerts-*'];

export const ExplorationDashboard = () => {
  const api = useEvalsApi();
  const queryClient = useQueryClient();
  const history = useHistory();

  // Form state
  const [agentRole, setAgentRole] = useState(DEFAULT_AGENT_ROLE);
  const [explorationDepth, setExplorationDepth] = useState(DEFAULT_EXPLORATION_DEPTH);
  const [minPatternFrequency, setMinPatternFrequency] = useState(DEFAULT_MIN_PATTERN_FREQUENCY);
  const [explorationMode, setExplorationMode] = useState<'full' | 'incremental'>('full');
  const [scopedIndices, setScopedIndices] = useState<Array<{ label: string }>>(
    DEFAULT_SCOPED_INDICES.map((idx) => ({ label: idx }))
  );

  const [isDeployingDashboard, setIsDeployingDashboard] = useState(false);
  const [deployDashboardError, setDeployDashboardError] = useState<string | null>(null);

  // Load exploration mode state from previous run
  useEffect(() => {
    api.http
      .get('/.aesop-exploration-state/_doc/latest')
      .then((result: unknown) => {
        const doc = result as { _source?: { last_run_timestamp?: string } };
        if (doc?._source?.last_run_timestamp) {
          // Previous run exists — default to incremental
          setExplorationMode('incremental');
        }
      })
      .catch(() => {
        // No previous state — stay with full
        setExplorationMode('full');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch active + recent explorations
  const {
    data: explorations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['aesop', 'explorations'],
    queryFn: async () => {
      const response = await api.http.get('/internal/aesop/exploration/history', {
        query: { limit: 20 },
        version: '1',
      });
      return response as { explorations: ExplorationRun[] };
    },
    refetchInterval: 5000,
  });

  // Trigger autonomous exploration
  const triggerExploration = useMutation({
    mutationFn: async () => {
      return await api.http.post('/internal/aesop/exploration/run', {
        body: JSON.stringify({
          agent_role: agentRole,
          exploration_depth: explorationDepth,
          min_pattern_frequency: minPatternFrequency,
          mode: explorationMode,
          scoped_indices: scopedIndices.map((i) => i.label),
        }),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'explorations'] });
    },
  });

  const allExplorations = explorations?.explorations ?? [];
  const activeExplorations = allExplorations.filter((e) => e.status === 'running');
  const completedExplorations = allExplorations.filter((e) => e.status === 'completed');
  const failedExplorations = allExplorations.filter((e) => e.status === 'failed');

  const successRate =
    allExplorations.length > 0
      ? Math.round((completedExplorations.length / allExplorations.length) * 100)
      : 0;

  const columns = [
    {
      field: 'execution_id',
      name: 'Execution ID',
      width: '15%',
      render: (id: string) => id,
    },
    {
      field: 'started_at',
      name: 'Started',
      width: '15%',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      field: 'agent_role',
      name: 'Inferred Role',
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
            {status === 'failed' && run.error_message && (
              <EuiText size="xs" color="danger">
                {run.error_message}
              </EuiText>
            )}
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
      render: (count?: number) => (count ? <EuiBadge color="success">{count}</EuiBadge> : '-'),
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
        <EuiButton
          size="s"
          onClick={() => viewDetails(run.execution_id)}
          aria-label={`View exploration details for execution ${run.execution_id}`}
        >
          View
        </EuiButton>
      ),
    },
  ];

  const viewDetails = (executionId: string) => {
    history.push(`/aesop/exploration/${executionId}`);
  };

  const handleDeployDashboard = useCallback(async () => {
    setIsDeployingDashboard(true);
    setDeployDashboardError(null);
    try {
      const result = await api.http.post('/internal/aesop/monitoring/dashboard/deploy', {
        version: '1',
      });
      const dashboardUrl = (result as any).url;
      window.open(dashboardUrl, '_blank');
    } catch (err) {
      setDeployDashboardError(getErrorMessage(err));
    } finally {
      setIsDeployingDashboard(false);
    }
  }, [api.http]);

  const modeOptions = [
    {
      id: 'full',
      label: 'Full Exploration',
    },
    {
      id: 'incremental',
      label: 'Incremental',
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="AESOP Exploration Dashboard"
          description="Monitor autonomous exploration workflows and discovered patterns"
          rightSideItems={[
            <EuiButton
              key="monitoring-dashboard"
              iconType="visBarVerticalStacked"
              onClick={handleDeployDashboard}
              isLoading={isDeployingDashboard}
              color="accent"
              aria-label="View AESOP performance dashboard"
            >
              View Performance Dashboard
            </EuiButton>,
          ]}
        />

        {deployDashboardError && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title="Failed to deploy dashboard" color="danger" iconType="error">
              <p>{deployDashboardError}</p>
            </EuiCallOut>
          </>
        )}

        <EuiSpacer />

        {/* Summary Stats */}
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={allExplorations.length}
                description="Total Explorations"
                titleColor="primary"
                isLoading={isLoading}
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
              <EuiStat title={`${successRate}%`} description="Success Rate" titleColor="success" />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat title={failedExplorations.length} description="Failed" titleColor="danger" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        {/* Active Exploration Progress */}
        {activeExplorations.length > 0 && (
          <>
            <EuiPanel>
              <EuiText>
                <h3>Active Exploration</h3>
              </EuiText>
              <EuiSpacer size="m" />
              {activeExplorations.map((exploration) => (
                <div key={exploration.execution_id}>
                  <ExplorationProgress
                    executionId={exploration.execution_id}
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['aesop', 'explorations'] });
                    }}
                  />
                  <EuiSpacer size="m" />
                </div>
              ))}
            </EuiPanel>
            <EuiSpacer />
          </>
        )}

        {/* Start New Exploration Form — only show when no active exploration */}
        {activeExplorations.length === 0 && (
          <>
            <EuiPanel>
              <EuiText>
                <h3>Start New Exploration</h3>
              </EuiText>
              <EuiSpacer size="m" />

              {/* Exploration mode */}
              <EuiFormRow label="Exploration Mode">
                <EuiRadioGroup
                  options={modeOptions}
                  idSelected={explorationMode}
                  onChange={(id) => setExplorationMode(id as 'full' | 'incremental')}
                  name="exploration-mode"
                />
              </EuiFormRow>

              {/* Mode explanations */}
              <EuiText size="s" color="subdued">
                <p>Explore all data from scratch</p>
                <p>Only explore data changed since last run</p>
              </EuiText>

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow label="Agent Role">
                    <EuiFieldText
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      aria-label="Agent Role"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow label="Exploration Depth">
                    <EuiFieldNumber
                      value={explorationDepth}
                      onChange={(e) => setExplorationDepth(Number(e.target.value))}
                      min={10}
                      max={1000}
                      aria-label="Exploration Depth"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow label="Min Pattern Frequency">
                    <EuiFieldNumber
                      value={minPatternFrequency}
                      onChange={(e) => setMinPatternFrequency(Number(e.target.value))}
                      min={1}
                      aria-label="Min Pattern Frequency"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              <EuiFormRow label="Scoped Indices">
                <EuiComboBox
                  placeholder="Add index patterns..."
                  selectedOptions={scopedIndices}
                  onChange={setScopedIndices}
                  onCreateOption={(searchValue) => {
                    setScopedIndices([...scopedIndices, { label: searchValue }]);
                  }}
                  isClearable
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="play"
                    onClick={() => triggerExploration.mutate()}
                    isLoading={triggerExploration.isLoading}
                  >
                    Start Exploration
                  </EuiButton>
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
                      The agent is autonomously discovering indices, inferring roles, and
                      calibrating sampling. Monitor progress below.
                    </p>
                  </EuiCallOut>
                </>
              )}

              {triggerExploration.isError && (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut title="Failed to start exploration" color="danger" iconType="error">
                    <p>{getErrorMessage(triggerExploration.error)}</p>
                  </EuiCallOut>
                </>
              )}
            </EuiPanel>
            <EuiSpacer />
          </>
        )}

        {/* Exploration History */}
        <EuiPanel>
          <EuiText>
            <h3>Exploration History</h3>
          </EuiText>
          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiLoadingSpinner size="xl" />
          ) : error ? (
            <>
              <EuiCallOut title="Failed to load explorations" color="danger" iconType="error">
                {getErrorMessage(error)}
              </EuiCallOut>
              <EuiSpacer size="m" />
              <EuiButton onClick={() => refetch()}>Retry</EuiButton>
            </>
          ) : allExplorations.length === 0 ? (
            <EuiEmptyPrompt
              iconType="beaker"
              title={<h2>No Explorations Yet</h2>}
              body={
                <>
                  <p>
                    AESOP autonomously explores your Elasticsearch data to discover patterns and
                    generate Agent Builder skills — no configuration required.
                  </p>
                  <EuiSpacer size="m" />
                  <EuiSteps
                    steps={[
                      {
                        title: 'Configure parameters',
                        children: (
                          <EuiText size="s" color="subdued">
                            Set your agent role, exploration depth, and target indices above
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Click Start Exploration',
                        children: (
                          <EuiText size="s" color="subdued">
                            AESOP discovers available indices and infers your role automatically
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Agent explores your data',
                        children: (
                          <EuiText size="s" color="subdued">
                            Autonomous discovery of patterns, relationships, and workflows
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Review proposed skills',
                        children: (
                          <EuiText size="s" color="subdued">
                            Navigate to Proposed Skills to validate and approve
                          </EuiText>
                        ),
                      },
                    ]}
                  />
                </>
              }
            />
          ) : (
            <EuiBasicTable
              items={allExplorations}
              columns={columns}
              tableLayout="auto"
              rowProps={(run) => ({
                onClick: () => viewDetails(run.execution_id),
                style: { cursor: 'pointer' },
              })}
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
