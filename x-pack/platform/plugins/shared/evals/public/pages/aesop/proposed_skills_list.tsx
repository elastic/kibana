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
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { useEvalsApi } from '../../hooks/use_evals_api';
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
  };
}

export const ProposedSkillsList = () => {
  const api = useEvalsApi();
  const [selectedSkill, setSelectedSkill] = useState<ProposedSkill | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review'>('pending_review');

  // Fetch proposed skills
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aesop', 'proposed-skills', statusFilter],
    queryFn: async () => {
      const response = await api.http.get('/internal/aesop/skills/proposed', {
        query: { status: statusFilter },
      });
      return response as { skills: ProposedSkill[]; total: number };
    },
  });

  const columns = [
    {
      field: 'name',
      name: 'Skill Name',
      width: '25%',
      render: (name: string, skill: ProposedSkill) => (
        <EuiText size="s">
          <strong>{name}</strong>
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
          passed: { color: 'success', label: `Passed (${(skill.validation.final_score! * 100).toFixed(0)}%)` },
          failed: { color: 'danger', label: 'Failed' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return <EuiHealth color={config.color}>{config.label}</EuiHealth>;
      },
    },
    {
      field: 'review.status',
      name: 'Review',
      width: '12%',
      render: (status: string) => {
        const colors = {
          pending_review: 'warning',
          approved: 'success',
          rejected: 'danger',
        };
        return <EuiBadge color={colors[status as keyof typeof colors] || 'default'}>{status.replace('_', ' ')}</EuiBadge>;
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
        <EuiButton
          size="s"
          onClick={() => setSelectedSkill(skill)}
        >
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
              >
                Refresh
              </EuiButton>,
            ]}
          />

          <EuiSpacer />

          {/* Filter buttons */}
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill={statusFilter === 'pending_review'}
                onClick={() => setStatusFilter('pending_review')}
              >
                Pending Review
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              >
                All Skills
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {/* Skills table */}
          {skills.length === 0 ? (
            <EuiEmptyPrompt
              iconType="search"
              title={<h2>No proposed skills</h2>}
              body={
                <p>
                  Run self-exploration to discover patterns and generate skills.
                  <br />
                  Go to <strong>Exploration Dashboard</strong> to start.
                </p>
              }
              actions={
                <EuiButton
                  iconType="play"
                  fill
                  href="/app/evals/aesop/exploration"
                >
                  Start Exploration
                </EuiButton>
              }
            />
          ) : (
            <EuiBasicTable
              items={skills}
              columns={columns}
              tableLayout="auto"
            />
          )}
        </EuiPageBody>
      </EuiPage>

      {/* Skill review flyout */}
      {selectedSkill && (
        <SkillReviewFlyout
          skill={selectedSkill}
          onClose={() => {
            setSelectedSkill(null);
            refetch();  // Refresh list after review
          }}
        />
      )}
    </>
  );
};
