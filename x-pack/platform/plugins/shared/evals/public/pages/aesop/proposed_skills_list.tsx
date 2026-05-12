/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiBasicTable,
  EuiHealth,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  EuiSteps,
  EuiPanel,
  EuiStat,
  EuiSuperSelect,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useHistory } from 'react-router-dom';
import { useEvalsApi } from '../../hooks/use_evals_api';
import { useLLMConnectors } from '../../hooks/use_llm_connectors';
import { SkillReviewFlyout } from './components/skill_review_flyout';

interface ProposedSkill {
  id: string;
  name: string;
  description: string;
  confidence: number;
  source: {
    pattern_frequency: number;
    rationale: string;
  };
  metadata: {
    created_at: string;
    indices_explored: number;
  };
  validation: {
    status: 'pending' | 'validating' | 'passed' | 'failed';
    final_score?: number;
  };
  review: {
    status: 'pending_review' | 'approved' | 'rejected';
    reviewed_by?: string;
  };
  improvement_type?: 'new' | 'improvement' | 'customization';
  base_skill?: {
    id: string;
    name: string;
    readonly: boolean;
  };
  cross_evaluation?: {
    triggered_by_rejection: string;
    action: 'auto_rejected' | 'flagged';
    severity: string;
    reason: string;
    evaluated_at: string;
  };
}

export const ProposedSkillsList = () => {
  const api = useEvalsApi();
  const queryClient = useQueryClient();
  const history = useHistory();
  const [selectedSkill, setSelectedSkill] = useState<ProposedSkill | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review'>('pending_review');
  const [derivedFromFilter, setDerivedFromFilter] = useState<string>('all');
  const [discoveryConnectorId, setDiscoveryConnectorId] = useState<string>('');
  const { data: connectors } = useLLMConnectors();

  // Auto-select first .gen-ai connector once
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  React.useEffect(() => {
    if (connectors?.length && !hasAutoSelected) {
      const genAi = connectors.find((c) => c.actionTypeId === '.gen-ai');
      setDiscoveryConnectorId(genAi?.id || connectors[0].id);
      setHasAutoSelected(true);
    }
  }, [connectors, hasAutoSelected]);

  // Fetch proposed skills
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aesop', 'proposed-skills', statusFilter, derivedFromFilter],
    queryFn: async () => {
      const response = await api.http.get('/internal/aesop/skills/proposed', {
        query: { status: statusFilter, derived_from: derivedFromFilter },
        version: '1',
      });
      return response as { skills: ProposedSkill[]; total: number };
    },
  });

  // Fetch last exploration — poll while running
  const { data: explorationHistory } = useQuery({
    queryKey: ['aesop', 'exploration-history'],
    queryFn: async () => {
      const response = await api.http.get('/internal/aesop/exploration/history', {
        version: '1',
      });
      return response as { explorations: any[] };
    },
    refetchInterval: (explorationData) => {
      const latest = explorationData?.explorations?.[0];
      return latest?.status === 'running' ? 3000 : false;
    },
  });

  const lastExploration = explorationHistory?.explorations?.[0];

  // Trigger new exploration
  const [optimisticRunning, setOptimisticRunning] = useState(false);
  const runExplorationMutation = useMutation({
    mutationFn: async () => {
      setOptimisticRunning(true);
      return await api.http.post('/internal/aesop/exploration/run', {
        body: JSON.stringify({
          connector_id: discoveryConnectorId || undefined,
        }),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'exploration-history'] });
      api.notifications.toasts.addSuccess(
        'Skill discovery started — skills will appear when exploration completes'
      );
    },
    onError: (err: Error) => {
      setOptimisticRunning(false);
      api.notifications.toasts.addDanger(`Failed to start exploration: ${err.message}`);
    },
  });

  // Clear optimistic state once the history query confirms the run
  const isHistoryRunning = lastExploration?.status === 'running';
  React.useEffect(() => {
    if (optimisticRunning && lastExploration?.status && lastExploration.status !== 'running') {
      setOptimisticRunning(false);
    }
  }, [optimisticRunning, lastExploration?.status]);

  const isDiscoveryRunning = isHistoryRunning || optimisticRunning;

  const columns = [
    {
      field: 'name',
      name: 'Skill Name',
      width: '25%',
      render: (name: string, skill: ProposedSkill) => (
        <EuiText size="s">
          <strong>{name}</strong>
          {skill.base_skill && (
            <>
              <br />
              <EuiBadge color="accent" iconType="wrench">
                Improves: {skill.base_skill.name}
              </EuiBadge>
            </>
          )}
          <br />
          <small style={{ color: '#69707D' }}>{skill.description}</small>
        </EuiText>
      ),
    },
    {
      field: 'confidence',
      name: 'Confidence',
      width: '10%',
      render: (confidence: number) => (
        <EuiBadge color={confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'danger'}>
          {(confidence * 100).toFixed(0)}%
        </EuiBadge>
      ),
    },
    {
      field: 'source.pattern_frequency',
      name: 'Pattern Freq',
      width: '10%',
      render: (freq: number) => (
        <EuiToolTip content={`Observed ${freq} times in persona behaviors`}>
          <EuiBadge>{freq}x</EuiBadge>
        </EuiToolTip>
      ),
    },
    {
      field: 'validation.status',
      name: 'Validation',
      width: '15%',
      render: (status: string, skill: ProposedSkill) => {
        const statusConfig = {
          pending: { color: 'default', label: 'Pending' },
          validating: { color: 'primary', label: 'Running...' },
          passed: {
            color: 'success',
            label: `Passed (${((skill.validation.final_score ?? 0) * 100).toFixed(0)}%)`,
          },
          failed: { color: 'danger', label: 'Failed' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return <EuiHealth color={config.color}>{config.label}</EuiHealth>;
      },
    },
    {
      field: 'review.status',
      name: 'Review Status',
      width: '15%',
      render: (status: string, skill: ProposedSkill) => {
        const colors: Record<string, string> = {
          pending_review: 'warning',
          approved: 'success',
          rejected: 'danger',
        };
        const crossEval = skill.cross_evaluation;
        const reviewedBy = skill.review?.reviewed_by;
        return (
          <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiBadge color={colors[status] || 'default'}>
                {reviewedBy === 'aesop-auto' ? 'auto-rejected' : status.replace('_', ' ')}
              </EuiBadge>
            </EuiFlexItem>
            {crossEval?.action === 'flagged' && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType="alert">
                  flagged
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'metadata.created_at',
      name: 'Discovered',
      width: '13%',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      name: 'Actions',
      width: '15%',
      render: (skill: ProposedSkill) => (
        <EuiButton size="s" onClick={() => setSelectedSkill(skill)} aria-label="Review">
          Review
        </EuiButton>
      ),
    },
  ];

  if (isLoading) {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={<h2>Loading proposed skills...</h2>}
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
            title={<h2>Failed to load skills</h2>}
            body={<p>{(error as Error).message}</p>}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  const skills = data?.skills || [];

  return (
    <>
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader
            pageTitle="AESOP: Proposed Skills"
            description="Agent Builder skills discovered through self-exploration. Review, validate, and approve for deployment."
            rightSideItems={[
              <EuiButton
                iconType="refresh"
                onClick={() => refetch()}
                aria-label="Refresh proposed skills list"
              >
                Refresh
              </EuiButton>,
            ]}
          />

          <EuiSpacer />

          {/* Last exploration info + Run Discovery */}
          <EuiPanel color="subdued">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="l" alignItems="center">
                  {lastExploration ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiStat
                          title={new Date(lastExploration.started_at).toLocaleDateString()}
                          description="Last Discovery"
                          titleSize="xs"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          position="bottom"
                          content={
                            lastExploration.scoped_indices?.length > 0
                              ? lastExploration.scoped_indices.join('\n')
                              : 'Index names not available'
                          }
                        >
                          <EuiStat
                            title={lastExploration.indices_discovered || 0}
                            description="Indices Explored"
                            titleSize="xs"
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiStat
                          title={lastExploration.skills_proposed || 0}
                          description="Skills Found"
                          titleSize="xs"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={
                            lastExploration.status === 'completed'
                              ? 'success'
                              : lastExploration.status === 'running'
                              ? 'primary'
                              : 'danger'
                          }
                        >
                          {lastExploration.status === 'running'
                            ? 'running...'
                            : lastExploration.status}
                        </EuiBadge>
                        {lastExploration.status === 'running' && <EuiLoadingSpinner size="s" />}
                      </EuiFlexItem>
                    </>
                  ) : (
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        No exploration has been run yet
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                    <EuiSuperSelect
                      options={(connectors || []).map((c) => ({
                        value: c.id,
                        inputDisplay: c.name,
                      }))}
                      valueOfSelected={discoveryConnectorId}
                      onChange={setDiscoveryConnectorId}
                      compressed
                      prepend="LLM"
                      disabled={isDiscoveryRunning}
                      aria-label="Select LLM connector for skill discovery"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="playFilled"
                      fill
                      onClick={() => runExplorationMutation.mutate()}
                      isLoading={isDiscoveryRunning}
                      disabled={isDiscoveryRunning || !discoveryConnectorId}
                      aria-label="Run skill discovery to find new patterns"
                    >
                      {isDiscoveryRunning ? 'Discovery Running...' : 'Run Skill Discovery'}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer />

          {/* Filter buttons */}
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill={statusFilter === 'pending_review'}
                onClick={() => setStatusFilter('pending_review')}
                aria-label="Filter skills by pending review status"
              >
                Pending Review
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                aria-label="Show all skills regardless of status"
              >
                All Skills
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ borderLeft: '1px solid #D3DAE6', paddingLeft: 8 }}>
              <EuiFlexGroup gutterSize="xs">
                {(
                  [
                    'all',
                    'llm',
                    'conversations',
                    'patterns',
                    'relationships',
                    'skill_improvement',
                  ] as const
                ).map((source) => (
                  <EuiFlexItem key={source} grow={false}>
                    <EuiBadge
                      color={derivedFromFilter === source ? 'primary' : 'hollow'}
                      onClick={() => setDerivedFromFilter(source)}
                      onClickAriaLabel={`Filter by ${source}`}
                    >
                      {source === 'all' ? 'All Sources' : source}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {/* Skills table */}
          {skills.length === 0 ? (
            <EuiEmptyPrompt
              iconType="sparkles"
              title={<h2>No Skills Discovered Yet</h2>}
              body={
                <>
                  <p>
                    {
                      "AESOP hasn't discovered any skills yet. Start an exploration to automatically"
                    }
                    identify patterns in your data and generate Agent Builder skills.
                  </p>
                  <EuiSpacer size="m" />
                  <EuiSteps
                    steps={[
                      {
                        title: 'Navigate to Exploration Dashboard',
                        children: (
                          <EuiText size="s" color="subdued">
                            Go to the exploration page to configure and start discovery
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Trigger exploration',
                        children: (
                          <EuiText size="s" color="subdued">
                            {'Set agent role and scoped indices, then click "Start Exploration"'}
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Wait for discovery',
                        children: (
                          <EuiText size="s" color="subdued">
                            AESOP will autonomously explore your data (~15 minutes)
                          </EuiText>
                        ),
                      },
                      {
                        title: 'Review skills here',
                        children: (
                          <EuiText size="s" color="subdued">
                            Return to this page to validate and approve discovered skills
                          </EuiText>
                        ),
                      },
                    ]}
                  />
                </>
              }
              actions={
                <EuiButton iconType="play" fill onClick={() => history.push('/aesop/exploration')}>
                  Go to Exploration Dashboard
                </EuiButton>
              }
            />
          ) : (
            <EuiBasicTable items={skills} columns={columns} tableLayout="auto" />
          )}
        </EuiPageBody>
      </EuiPage>

      {/* Skill review flyout */}
      {selectedSkill && (
        <SkillReviewFlyout
          skill={selectedSkill}
          onClose={() => {
            setSelectedSkill(null);
            refetch(); // Refresh list after review
          }}
        />
      )}
    </>
  );
};
