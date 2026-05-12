/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Execution Detail Page
 *
 * Shows detailed view of a single exploration workflow execution:
 * - Workflow execution trace (LangGraph steps)
 * - Discovered schemas and patterns
 * - Generated skills
 * - Performance metrics
 * - Link to O11y trace waterfall
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiText,
  EuiSteps,
  EuiHealth,
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useEvalsApi } from '../../hooks/use_evals_api';
import { TraceWaterfall } from '../../components/trace_waterfall';

interface ExecutionDetail {
  execution_id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  agent_role: string;
  scoped_indices: string[];
  exploration_depth: number;
  min_pattern_frequency: number;

  // Workflow trace
  workflow_steps: Array<{
    step_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    error?: string;
  }>;

  // Discoveries
  schemas_discovered: Array<{
    index_pattern: string;
    field_count: number;
    sample_count: number;
    key_fields: string[];
  }>;

  patterns_identified: Array<{
    pattern_name: string;
    frequency: number;
    confidence: number;
    rationale: string;
    example_queries: string[];
  }>;

  // Generated skills
  skills_proposed: Array<{
    id: string;
    name: string;
    description: string;
    confidence: number;
    validation_status: string;
  }>;

  // Performance metrics
  metrics: {
    total_duration_ms?: number;
    indices_explored: number;
    relationships_discovered: number;
    patterns_found: number;
    skills_generated: number;
    total_tokens_used?: number;
    total_cost_usd?: number;
  };

  // O11y trace ID
  trace_id?: string;
  error_message?: string;
}

export const ExecutionDetailPage = () => {
  const { executionId } = useParams<{ executionId: string }>();
  const api = useEvalsApi();
  const [showTraceFlyout, setShowTraceFlyout] = useState(false);

  const {
    data: execution,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['aesop', 'execution', executionId],
    queryFn: async () => {
      const response = await api.http.get(`/internal/aesop/exploration/executions/${executionId}`, {
        version: '1',
      });
      return response as ExecutionDetail;
    },
    refetchInterval: (data) => {
      // Poll every 3s if still running
      return data?.status === 'running' ? 3000 : false;
    },
  });

  if (isLoading) {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={<h2>Loading execution details...</h2>}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (error) {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            title={<h2>Failed to load execution</h2>}
            body={<p>{(error as Error).message}</p>}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (!execution) {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="search"
            title={<h2>Execution not found</h2>}
            body={<p>No execution found with ID: {executionId}</p>}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  const statusColor = {
    running: 'primary',
    completed: 'success',
    failed: 'danger',
  }[execution.status];

  const statusLabel = {
    running: 'Running...',
    completed: 'Completed',
    failed: 'Failed',
  }[execution.status];

  // Convert workflow steps to EuiSteps format
  const workflowStepsFormatted = execution.workflow_steps.map((step, idx) => {
    let status: 'complete' | 'incomplete' | 'warning' | 'danger' | 'loading' | 'disabled' =
      'incomplete';

    if (step.status === 'completed') status = 'complete';
    else if (step.status === 'running') status = 'loading';
    else if (step.status === 'failed') status = 'danger';

    return {
      title: step.step_name,
      status,
      children: (
        <>
          {step.duration_ms && (
            <EuiText size="s" color="subdued">
              Duration: {step.duration_ms.toFixed(0)}ms
            </EuiText>
          )}
          {step.error && (
            <EuiCallOut title="Step failed" color="danger" size="s">
              {step.error}
            </EuiCallOut>
          )}
        </>
      ),
    };
  });

  const schemaColumns = [
    {
      field: 'index_pattern',
      name: 'Index Pattern',
      width: '30%',
    },
    {
      field: 'field_count',
      name: 'Fields',
      width: '15%',
    },
    {
      field: 'sample_count',
      name: 'Samples',
      width: '15%',
    },
    {
      field: 'key_fields',
      name: 'Key Fields',
      width: '40%',
      render: (fields: string[]) =>
        fields.slice(0, 5).join(', ') + (fields.length > 5 ? '...' : ''),
    },
  ];

  const patternColumns = [
    {
      field: 'pattern_name',
      name: 'Pattern',
      width: '25%',
    },
    {
      field: 'frequency',
      name: 'Frequency',
      width: '15%',
      render: (freq: number) => `${freq}x`,
    },
    {
      field: 'confidence',
      name: 'Confidence',
      width: '15%',
      render: (conf: number) => (
        <EuiBadge color={conf >= 0.8 ? 'success' : conf >= 0.6 ? 'warning' : 'danger'}>
          {(conf * 100).toFixed(0)}%
        </EuiBadge>
      ),
    },
    {
      field: 'rationale',
      name: 'Rationale',
      width: '45%',
      truncateText: true,
    },
  ];

  const skillColumns = [
    {
      field: 'name',
      name: 'Skill Name',
      width: '30%',
    },
    {
      field: 'description',
      name: 'Description',
      width: '40%',
      truncateText: true,
    },
    {
      field: 'confidence',
      name: 'Confidence',
      width: '15%',
      render: (conf: number) => (
        <EuiBadge color={conf >= 0.8 ? 'success' : conf >= 0.6 ? 'warning' : 'danger'}>
          {(conf * 100).toFixed(0)}%
        </EuiBadge>
      ),
    },
    {
      field: 'validation_status',
      name: 'Validation',
      width: '15%',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'default',
          validating: 'primary',
          passed: 'success',
          failed: 'danger',
        };
        return <EuiHealth color={colors[status] || 'default'}>{status}</EuiHealth>;
      },
    },
  ];

  return (
    <>
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader
            pageTitle={`Exploration: ${execution.agent_role}`}
            description={`Execution ID: ${execution.execution_id}`}
            rightSideItems={[
              execution.trace_id ? (
                <EuiButton iconType="apmTrace" onClick={() => setShowTraceFlyout(true)}>
                  View O11y Trace
                </EuiButton>
              ) : undefined,
            ].filter(Boolean)}
          />

          <EuiSpacer />

          {/* Status & Error */}
          {execution.status === 'failed' && execution.error_message && (
            <>
              <EuiCallOut title="Exploration failed" color="danger" iconType="error">
                {execution.error_message}
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {execution.status === 'running' && (
            <>
              <EuiCallOut title="Exploration in progress" color="primary" iconType="clock">
                This exploration is currently running. The page will auto-refresh.
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {/* Summary Stats */}
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <EuiStat
                  title={statusLabel}
                  description="Status"
                  titleColor={statusColor}
                  isLoading={execution.status === 'running'}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <EuiStat
                  title={execution.metrics.indices_explored}
                  description="Indices Explored"
                  titleColor="primary"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <EuiStat
                  title={execution.metrics.patterns_found}
                  description="Patterns Found"
                  titleColor="accent"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <EuiStat
                  title={execution.metrics.skills_generated}
                  description="Skills Generated"
                  titleColor="success"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <EuiStat
                  title={
                    execution.metrics.total_duration_ms
                      ? `${(execution.metrics.total_duration_ms / 60000).toFixed(1)}m`
                      : '-'
                  }
                  description="Duration"
                  titleColor="subdued"
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {/* Configuration */}
          <EuiPanel>
            <EuiTitle size="s">
              <h3>Configuration</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Agent Role',
                  description: execution.agent_role,
                },
                {
                  title: 'Scoped Indices',
                  description: execution.scoped_indices.join(', '),
                },
                {
                  title: 'Exploration Depth',
                  description: execution.exploration_depth,
                },
                {
                  title: 'Min Pattern Frequency',
                  description: execution.min_pattern_frequency,
                },
                {
                  title: 'Started At',
                  description: new Date(execution.started_at).toLocaleString(),
                },
                {
                  title: 'Completed At',
                  description: execution.completed_at
                    ? new Date(execution.completed_at).toLocaleString()
                    : '-',
                },
              ]}
            />
          </EuiPanel>

          <EuiSpacer />

          {/* Workflow Steps */}
          <EuiPanel>
            <EuiTitle size="s">
              <h3>Workflow Execution Trace</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiSteps steps={workflowStepsFormatted} />
          </EuiPanel>

          <EuiSpacer />

          {/* Discovered Schemas */}
          {execution.schemas_discovered.length > 0 && (
            <>
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Discovered Schemas</h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={execution.schemas_discovered as any[]}
                  columns={schemaColumns}
                  tableLayout="auto"
                />
              </EuiPanel>
              <EuiSpacer />
            </>
          )}

          {/* Identified Patterns */}
          {execution.patterns_identified.length > 0 && (
            <>
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Identified Patterns</h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={execution.patterns_identified}
                  columns={patternColumns}
                  tableLayout="auto"
                />
              </EuiPanel>
              <EuiSpacer />
            </>
          )}

          {/* Proposed Skills */}
          {execution.skills_proposed.length > 0 && (
            <>
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Proposed Skills</h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={execution.skills_proposed}
                  columns={skillColumns}
                  tableLayout="auto"
                />
              </EuiPanel>
              <EuiSpacer />
            </>
          )}

          {/* Performance Metrics */}
          {(execution.metrics.total_tokens_used || execution.metrics.total_cost_usd) && (
            <>
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Performance Metrics</h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  {execution.metrics.total_tokens_used && (
                    <EuiFlexItem>
                      <EuiStat
                        title={execution.metrics.total_tokens_used.toLocaleString()}
                        description="Total Tokens Used"
                        titleSize="s"
                      />
                    </EuiFlexItem>
                  )}
                  {execution.metrics.total_cost_usd && (
                    <EuiFlexItem>
                      <EuiStat
                        title={`$${execution.metrics.total_cost_usd.toFixed(4)}`}
                        description="Total Cost (USD)"
                        titleSize="s"
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
        </EuiPageBody>
      </EuiPage>

      {/* O11y Trace Flyout */}
      {showTraceFlyout && execution.trace_id && (
        <EuiFlyout onClose={() => setShowTraceFlyout(false)} size="l" ownFocus>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>Observability Trace</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <TraceWaterfall traceId={execution.trace_id} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
