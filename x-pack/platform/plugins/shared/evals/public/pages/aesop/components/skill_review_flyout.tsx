/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTextArea,
  EuiFormRow,
  EuiCallOut,
  EuiBadge,
} from '@elastic/eui';
import { useMutation } from '@tanstack/react-query';
import { useEvalsApi } from '../../../hooks/use_evals_api';
import { TraceWaterfall } from '../../../components/trace_waterfall';  // Reuse from evals plugin!

interface SkillReviewFlyoutProps {
  skill: any;
  onClose: () => void;
}

export const SkillReviewFlyout = ({ skill, onClose }: SkillReviewFlyoutProps) => {
  const api = useEvalsApi();
  const [reviewNotes, setReviewNotes] = useState('');
  const [showTraceFlyout, setShowTraceFlyout] = useState(false);

  // Approve skill mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return await api.http.post(`/internal/aesop/skills/${skill.id}/approve`, {
        body: { review_notes: reviewNotes },
      });
    },
    onSuccess: () => {
      onClose();
    },
  });

  // Reject skill mutation (TODO: implement reject endpoint)
  const rejectMutation = useMutation({
    mutationFn: async () => {
      return await api.http.post(`/internal/aesop/skills/${skill.id}/reject`, {
        body: { review_notes: reviewNotes },
      });
    },
    onSuccess: () => {
      onClose();
    },
  });

  const canApprove = skill.validation?.status === 'passed';

  return (
    <>
      <EuiFlyout onClose={onClose} size="l" ownFocus>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>{skill.name}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {skill.description}
          </EuiText>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {/* Validation Status */}
          {!canApprove && (
            <>
              <EuiCallOut
                title="Skill must pass validation before approval"
                color="warning"
                iconType="alert"
              >
                <p>Current validation status: {skill.validation?.status || 'pending'}</p>
                {skill.validation?.status === 'pending' && (
                  <EuiButton size="s" onClick={() => { /* TODO: trigger validation */ }}>
                    Run Validation
                  </EuiButton>
                )}
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {/* Evaluation Score */}
          {skill.validation?.final_score && (
            <>
              <EuiPanel>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiStat
                      title={`${(skill.validation.final_score * 100).toFixed(1)}%`}
                      description="Quality Score"
                      titleColor={skill.validation.status === 'passed' ? 'success' : 'danger'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiStat
                      title={skill.validation.iterations?.length || 0}
                      description="Improvement Iterations"
                      titleColor="primary"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      size="s"
                      iconType="apmTrace"
                      onClick={() => setShowTraceFlyout(true)}
                      disabled={!skill.validation?.eval_trace_id}
                    >
                      View Trace
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}

          {/* Skill Content Preview */}
          <EuiPanel>
            <EuiTitle size="s"><h3>Skill Content</h3></EuiTitle>
            <EuiSpacer />
            <EuiCodeBlock language="markdown" isCopyable>
              {skill.markdown}
            </EuiCodeBlock>
          </EuiPanel>

          <EuiSpacer />

          {/* Discovery Metadata */}
          <EuiPanel>
            <EuiTitle size="s"><h3>Discovery Source</h3></EuiTitle>
            <EuiSpacer />
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Pattern Frequency',
                  description: `${skill.source.pattern_frequency} instances`,
                },
                {
                  title: 'Rationale',
                  description: skill.source.rationale,
                },
                {
                  title: 'Confidence',
                  description: (
                    <EuiBadge color={skill.confidence >= 0.8 ? 'success' : 'warning'}>
                      {(skill.confidence * 100).toFixed(1)}%
                    </EuiBadge>
                  ),
                },
                {
                  title: 'Discovered',
                  description: new Date(skill.metadata.created_at).toLocaleString(),
                },
                {
                  title: 'Indices Explored',
                  description: skill.metadata.indices_explored,
                },
              ]}
            />
          </EuiPanel>

          <EuiSpacer />

          {/* Review Notes */}
          <EuiFormRow
            label="Review Notes (optional)"
            helpText="Add notes about this skill for the team"
          >
            <EuiTextArea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g., Approved for production use. Addresses common triage workflow."
            />
          </EuiFormRow>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => rejectMutation.mutate()}
                color="danger"
                isLoading={rejectMutation.isPending}
              >
                Reject
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose}>
                    Cancel
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="success"
                    onClick={() => approveMutation.mutate()}
                    disabled={!canApprove}
                    isLoading={approveMutation.isPending}
                  >
                    Approve & Deploy to Agent Builder
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {/* Trace Waterfall Flyout (Nested) */}
      {showTraceFlyout && skill.validation?.eval_trace_id && (
        <EuiFlyout
          onClose={() => setShowTraceFlyout(false)}
          size="l"
          ownFocus
        >
          <EuiFlyoutHeader>
            <EuiTitle><h2>Skill Execution Trace</h2></EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {/* Reuse TraceWaterfall component from evals plugin! */}
            <TraceWaterfall traceId={skill.validation.eval_trace_id} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
