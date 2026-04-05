/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
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

export const ExplorationDashboard = () => {
  const api = useEvalsApi();
  const queryClient = useQueryClient();
  const history = useHistory();

  const [isDeployingDashboard, setIsDeployingDashboard] = useState(false);
  const [deployDashboardError, setDeployDashboardError] = useState<string | null>(null);

  // Fetch active + recent explorations
  const {
    data: explorations,
    isLoading,
    error,
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

  // Trigger autonomous exploration — no user config needed
  const triggerExploration = useMutation({
    mutationFn: async () => {
      return await api.http.post('/internal/aesop/exploration/run', {
        body: JSON.stringify({}),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'explorations'] });
    },
  });

  const activeExplorations = explorations?.explorations.filter((e) => e.status === 'running') || [];
  const completedExplorations =
    explorations?.explorations.filter((e) => e.status === 'completed') || [];
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

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="AESOP: Self-Exploration Dashboard"
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
                title={activeExplorations.length}
                description="Active Explorations"
                titleColor="primary"
                isLoading={isLoading}
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
              <EuiStat title={failedExplorations.length} description="Failed" titleColor="danger" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        {/* Start Autonomous Exploration */}
        <EuiPanel>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText>
                <h3>Start Autonomous Exploration</h3>
              </EuiText>
              <EuiText size="s" color="subdued">
                AESOP will automatically discover available indices, infer your analyst role from
                usage patterns, and calibrate sampling depth — no configuration needed.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="play"
                onClick={() => triggerExploration.mutate()}
                isLoading={triggerExploration.isLoading}
                disabled={activeExplorations.length > 0}
                aria-label="Start autonomous exploration of your data"
              >
                {activeExplorations.length > 0 ? 'Exploration Running...' : 'Start Exploration'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {triggerExploration.isSuccess && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut title="Exploration started" color="success" iconType="check">
                <p>
                  Execution ID: {(triggerExploration.data as any).execution_id}
                  <br />
                  The agent is autonomously discovering indices, inferring roles, and calibrating
                  sampling. Monitor progress below.
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

        {/* Active Exploration Progress */}
        {activeExplorations.length > 0 && (
          <>
            <EuiPanel>
              <EuiText>
                <h3>Active Explorations</h3>
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

        {/* Exploration History */}
        <EuiPanel>
          <EuiText>
            <h3>Exploration History</h3>
          </EuiText>
          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiLoadingSpinner size="xl" />
          ) : error ? (
            <EuiCallOut title="Failed to load explorations" color="danger" iconType="error">
              {getErrorMessage(error)}
            </EuiCallOut>
          ) : explorations?.explorations.length === 0 ? (
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
                        title: 'Click "Start Exploration"',
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
              actions={
                <EuiButton
                  fill
                  iconType="play"
                  onClick={() => triggerExploration.mutate()}
                  isLoading={triggerExploration.isLoading}
                  aria-label="Start autonomous exploration of your data"
                >
                  Start Exploration
                </EuiButton>
              }
            />
          ) : (
            <EuiBasicTable
              items={explorations?.explorations || []}
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
