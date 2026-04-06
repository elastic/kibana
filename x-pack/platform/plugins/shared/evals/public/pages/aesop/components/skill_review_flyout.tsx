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
  EuiSuperSelect,
  EuiLoadingSpinner,
  EuiProgress,
  EuiFieldText,
  EuiToolTip,
} from '@elastic/eui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEvalsApi } from '../../../hooks/use_evals_api';
import { useLLMConnectors } from '../../../hooks/use_llm_connectors';

interface SkillReviewFlyoutProps {
  skill: any;
  onClose: () => void;
}

export const SkillReviewFlyout = ({ skill: initialSkill, onClose }: SkillReviewFlyoutProps) => {
  const api = useEvalsApi();
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [editedName, setEditedName] = useState(initialSkill.name);
  const [editedDescription, setEditedDescription] = useState(initialSkill.description);
  const [editedMarkdown, setEditedMarkdown] = useState(initialSkill.markdown || '');

  // Poll for skill updates while validating (single-document endpoint avoids N+1)
  const { data: polledSkill } = useQuery({
    queryKey: ['aesop', 'skill-detail', initialSkill.id],
    queryFn: async () => {
      const response = await api.http.get(`/internal/aesop/skills/${initialSkill.id}`, {
        version: '1',
      });
      return response;
    },
    initialData: initialSkill,
    refetchInterval: (data) => {
      return (data?.validation?.status === 'validating' || isValidating || isImproving) ? 2000 : false;
    },
  });

  const skill = polledSkill || initialSkill;

  // Clear local validating state when server confirms terminal status
  React.useEffect(() => {
    if (isValidating && skill.validation?.status !== 'validating' && skill.validation?.status !== 'pending') {
      setIsValidating(false);
    }
  }, [isValidating, skill.validation?.status]);

  const { data: connectors, isLoading: connectorsLoading } = useLLMConnectors();

  // Auto-select first .gen-ai connector, or first available — only once
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  React.useEffect(() => {
    if (connectors?.length && !hasAutoSelected) {
      const genAi = connectors.find((c) => c.actionTypeId === '.gen-ai');
      setSelectedConnectorId(genAi?.id || connectors[0].id);
      setHasAutoSelected(true);
    }
  }, [connectors, hasAutoSelected]);

  // Approve skill mutation
  const approveMutation = useMutation({
    mutationFn: async (params?: { updateExisting?: boolean }) => {
      return await api.http.post(`/internal/aesop/skills/${skill.id}/approve`, {
        body: JSON.stringify({
          review_notes: reviewNotes,
          update_existing: params?.updateExisting || false,
        }),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      api.notifications.toasts.addSuccess(`Skill "${skill.name}" approved and deployed`);
      onClose();
    },
    onError: (error: Error) => {
      api.notifications.toasts.addDanger(`Failed to approve: ${error.message}`);
    },
  });

  // Reject skill mutation — passes connector_id to trigger cross-evaluation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      return await api.http.post(`/internal/aesop/skills/${skill.id}/reject`, {
        body: JSON.stringify({
          review_notes: reviewNotes,
          connector_id: selectedConnectorId || undefined,
        }),
        version: '1',
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      const msg = result?.cross_evaluation_triggered
        ? `Skill "${skill.name}" rejected. Evaluating remaining skills for similar issues...`
        : `Skill "${skill.name}" rejected`;
      api.notifications.toasts.addSuccess(msg);
      onClose();
    },
    onError: (error: Error) => {
      api.notifications.toasts.addDanger(`Failed to reject: ${error.message}`);
    },
  });

  // Unreject mutation — restore to pending review
  const unrejectMutation = useMutation({
    mutationFn: async () => {
      return await api.http.post(`/internal/aesop/skills/${skill.id}/unreject`, {
        body: JSON.stringify({}),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      queryClient.invalidateQueries({ queryKey: ['aesop', 'skill-detail', initialSkill.id] });
      api.notifications.toasts.addSuccess('Skill restored to pending review');
    },
    onError: (error: Error) => {
      api.notifications.toasts.addDanger(`Failed to restore: ${error.message}`);
    },
  });

  // Re-deploy to Agent Builder (for approved skills deleted by mistake)
  const redeployMutation = useMutation({
    mutationFn: async () => {
      // The approve endpoint handles creating the skill in Agent Builder
      // Force re-approval by temporarily resetting validation status, then re-approving
      return await api.http.post(`/internal/aesop/skills/${skill.id}/redeploy`, {
        body: JSON.stringify({}),
        version: '1',
      });
    },
    onSuccess: () => {
      api.notifications.toasts.addSuccess('Skill re-deployed to Agent Builder');
    },
    onError: (error: Error) => {
      api.notifications.toasts.addDanger(`Failed to re-deploy: ${error.message}`);
    },
  });

  // Save edits mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await api.http.put(`/internal/aesop/skills/${skill.id}`, {
        body: JSON.stringify({
          name: editedName,
          description: editedDescription,
          markdown: editedMarkdown,
        }),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      queryClient.invalidateQueries({ queryKey: ['aesop', 'skill-detail', initialSkill.id] });
      api.notifications.toasts.addSuccess('Skill updated — re-run validation to verify changes');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      api.notifications.toasts.addDanger(`Failed to save: ${error.message}`);
    },
  });

  // Auto-improve mutation
  const improveMutation = useMutation({
    mutationFn: async () => {
      setIsImproving(true);
      return await api.http.post(`/internal/aesop/skills/${skill.id}/improve`, {
        body: JSON.stringify({ connector_id: selectedConnectorId }),
        version: '1',
      });
    },
    onSuccess: () => {
      // Keep isImproving true — auto-validation is running in background
      // The polling + useEffect will clear it when validation completes
      setIsValidating(true);
      setIsImproving(false);
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      queryClient.invalidateQueries({ queryKey: ['aesop', 'skill-detail', initialSkill.id] });
    },
    onError: (error: Error) => {
      setIsImproving(false);
      api.notifications.toasts.addDanger(`Failed to improve: ${error.message}`);
    },
  });

  // Validation trigger mutation
  const validateMutation = useMutation({
    mutationFn: async (params?: { autoConverge?: boolean }) => {
      setIsValidating(true);
      return await api.http.post(`/internal/aesop/skills/${skill.id}/validate`, {
        body: JSON.stringify({
          connector_id: selectedConnectorId,
          auto_converge: params?.autoConverge || false,
        }),
        version: '1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      queryClient.invalidateQueries({ queryKey: ['aesop', 'skill-detail', initialSkill.id] });
    },
    onError: (error: Error) => {
      setIsValidating(false);
      api.notifications.toasts.addDanger(`Validation failed: ${error.message}`);
    },
  });

  const canApprove = skill.validation?.status === 'passed';
  const isReviewable = skill.review?.status === 'pending_review';
  const connectorOptions = (connectors || []).map((c) => ({
    value: c.id,
    inputDisplay: c.name,
    dropdownDisplay: (
      <>
        <strong>{c.name}</strong>
        <EuiText size="xs" color="subdued">
          <p>{c.actionTypeId.replace('.', '').replace('-', ' ')}</p>
        </EuiText>
      </>
    ),
  }));

  return (
    <>
      <EuiFlyout onClose={onClose} size="l" ownFocus>
        <EuiFlyoutHeader>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2>{skill.name}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {skill.description}
              </EuiText>
            </EuiFlexItem>
            {isReviewable && (
              <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
                <EuiSuperSelect
                  options={connectorOptions}
                  valueOfSelected={selectedConnectorId}
                  onChange={setSelectedConnectorId}
                  isLoading={connectorsLoading}
                  compressed
                  prepend="LLM"
                  disabled={connectorsLoading || connectorOptions.length === 0}
                  aria-label="Select LLM connector for validation"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {/* Skill Improvement info */}
          {skill.base_skill && (
            <>
              <EuiPanel color="accent">
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="s"><h3>Based on: {skill.base_skill.name}</h3></EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={skill.base_skill.readonly ? 'default' : 'primary'}>
                      {skill.base_skill.readonly ? 'Built-in Skill' : 'User Skill'}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">{skill.source?.rationale || 'Improvement proposed based on discovered data patterns.'}</EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}

          {/* Cross-evaluation warning */}
          {skill.cross_evaluation?.action === 'flagged' && (
            <>
              <EuiCallOut
                title={`Potentially affected by rejection of a related skill`}
                color="warning"
                iconType="alert"
              >
                <EuiText size="s">{skill.cross_evaluation.reason}</EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  Severity: {skill.cross_evaluation.severity} — review carefully before approving
                </EuiText>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {/* In-progress states */}
          {isImproving && (
            <>
              <EuiCallOut
                title="Applying LLM suggestions"
                color="primary"
                iconType="sparkles"
              >
                <EuiProgress size="s" color="primary" />
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      The LLM is rewriting the skill based on validation feedback. This typically takes 10-20 seconds.
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          {!isImproving && (isValidating || skill.validation?.status === 'validating') && (
            <>
              <EuiCallOut
                title="LLM validation in progress"
                color="primary"
                iconType="iInCircle"
              >
                <EuiProgress size="s" color="primary" />
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      The skill is being evaluated by the LLM. This typically takes 5-15 seconds.
                      The results will appear automatically when complete.
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          {isReviewable && skill.validation?.status !== 'validating' && !isValidating && (
            <>
              {!canApprove ? (
                <EuiCallOut
                  title="Skill must pass validation before approval"
                  color={skill.validation?.status === 'failed' ? 'danger' : 'warning'}
                  iconType={skill.validation?.status === 'failed' ? 'error' : 'alert'}
                >
                  <p>Current validation status: {skill.validation?.status || 'pending'}</p>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        onClick={() => validateMutation.mutate()}
                        disabled={!selectedConnectorId}
                        aria-label={`Run validation for ${skill.name}`}
                      >
                        {skill.validation?.status === 'failed' ? 'Re-run Validation' : 'Run Validation'}
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        fill
                        iconType="sparkles"
                        onClick={() => validateMutation.mutate({ autoConverge: true })}
                        disabled={!selectedConnectorId}
                        aria-label={`Validate and auto-improve ${skill.name}`}
                      >
                        Validate & Auto-Improve
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiCallOut>
              ) : (
                <EuiCallOut
                  title="Validation passed — ready for approval"
                  color="success"
                  iconType="check"
                >
                  <EuiButton
                    size="s"
                    onClick={() => validateMutation.mutate()}
                    disabled={!selectedConnectorId}
                    aria-label={`Run validation for ${skill.name}`}
                  >
                    Re-run Validation
                  </EuiButton>
                </EuiCallOut>
              )}
              <EuiSpacer />
            </>
          )}

          {/* Evaluation Score + LLM Feedback — hidden during re-validation or improvement */}
          {skill.validation?.final_score != null && !isValidating && !isImproving && skill.validation?.status !== 'validating' && (
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
                  {skill.validation.duration_ms && (
                    <EuiFlexItem>
                      <EuiStat
                        title={`${(skill.validation.duration_ms / 1000).toFixed(1)}s`}
                        description="Validation Time"
                        titleColor="subdued"
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                {skill.validation?.iterations?.length > 1 && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiFlexGroup gutterSize="xs" wrap>
                      {skill.validation.iterations.map((iter: any, i: number) => (
                        <EuiFlexItem key={i} grow={false}>
                          <EuiBadge color={iter.score >= 0.85 ? 'success' : 'default'}>
                            #{iter.iteration}: {(iter.score * 100).toFixed(0)}%
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </>
                )}
              </EuiPanel>
              <EuiSpacer size="s" />

              {/* Criteria Breakdown */}
              {skill.validation.criteria && (
                <>
                  <EuiPanel>
                    <EuiTitle size="xs"><h4>Evaluation Criteria</h4></EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiFlexGroup gutterSize="s" wrap>
                      {Object.entries(skill.validation.criteria as Record<string, number>).map(
                        ([criterion, score]) => (
                          <EuiFlexItem key={criterion} grow={false} style={{ minWidth: 120 }}>
                            <EuiStat
                              title={`${(score * 100).toFixed(0)}%`}
                              description={criterion.charAt(0).toUpperCase() + criterion.slice(1)}
                              titleSize="xs"
                              titleColor={score >= 0.85 ? 'success' : score >= 0.6 ? 'default' : 'danger'}
                            />
                          </EuiFlexItem>
                        )
                      )}
                    </EuiFlexGroup>
                  </EuiPanel>
                  <EuiSpacer size="s" />
                </>
              )}

              {/* LLM Feedback */}
              {skill.validation.llm_feedback && (
                <EuiPanel>
                  <EuiTitle size="xs"><h4>LLM Feedback</h4></EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">{skill.validation.llm_feedback}</EuiText>

                  {skill.validation.strengths?.length > 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs"><strong>Strengths</strong></EuiText>
                      <ul>
                        {skill.validation.strengths.map((s: string, i: number) => (
                          <li key={i}><EuiText size="xs">{s}</EuiText></li>
                        ))}
                      </ul>
                    </>
                  )}

                  {skill.validation.weaknesses?.length > 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs"><strong>Weaknesses</strong></EuiText>
                      <ul>
                        {skill.validation.weaknesses.map((w: string, i: number) => (
                          <li key={i}><EuiText size="xs">{w}</EuiText></li>
                        ))}
                      </ul>
                    </>
                  )}

                  {skill.validation.suggestions?.length > 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs"><strong>Suggestions</strong></EuiText>
                      <ul>
                        {skill.validation.suggestions.map((s: string, i: number) => (
                          <li key={i}><EuiText size="xs">{s}</EuiText></li>
                        ))}
                      </ul>
                    </>
                  )}

                  {isReviewable && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiButton
                        iconType="sparkles"
                        onClick={() => improveMutation.mutate()}
                        isLoading={improveMutation.isPending}
                        disabled={!selectedConnectorId}
                        size="s"
                        fill
                        aria-label="Apply LLM suggestions to improve skill"
                      >
                        Apply LLM Suggestions
                      </EuiButton>
                    </>
                  )}
                </EuiPanel>
              )}
              <EuiSpacer />
            </>
          )}

          {/* Skill Content — view or edit */}
          <EuiPanel>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s"><h3>Skill Content</h3></EuiTitle>
              </EuiFlexItem>
              {isReviewable && (
                <EuiFlexItem grow={false}>
                  {isEditing ? (
                    <EuiFlexGroup gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          onClick={() => {
                            setEditedName(skill.name);
                            setEditedDescription(skill.description);
                            setEditedMarkdown(skill.markdown || '');
                            setIsEditing(false);
                          }}
                          aria-label="Cancel editing"
                        >
                          Cancel
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          fill
                          onClick={() => saveMutation.mutate()}
                          isLoading={saveMutation.isPending}
                          aria-label="Save skill content changes"
                        >
                          Save Changes
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <EuiButtonEmpty
                      size="s"
                      iconType="pencil"
                      onClick={() => {
                        setEditedName(skill.name);
                        setEditedDescription(skill.description);
                        setEditedMarkdown(skill.markdown || '');
                        setIsEditing(true);
                      }}
                      aria-label="Edit skill content"
                    >
                      Edit
                    </EuiButtonEmpty>
                  )}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />

            {isEditing ? (
              <>
                <EuiFormRow label="Skill Name" fullWidth>
                  <EuiFieldText
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    fullWidth
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
                <EuiFormRow label="Description" fullWidth>
                  <EuiTextArea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={2}
                    fullWidth
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
                <EuiFormRow
                  label="Skill Markdown"
                  helpText="Edit the skill content. Saving will reset validation — re-run to verify your changes."
                  fullWidth
                >
                  <EuiTextArea
                    value={editedMarkdown}
                    onChange={(e) => setEditedMarkdown(e.target.value)}
                    rows={15}
                    fullWidth
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </EuiFormRow>
              </>
            ) : (
              <EuiCodeBlock language="markdown" isCopyable>
                {skill.markdown}
              </EuiCodeBlock>
            )}
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
                  description: `${skill.source?.pattern_frequency ?? 'N/A'} instances`,
                },
                {
                  title: 'Rationale',
                  description: skill.source?.rationale ?? 'N/A',
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
                  title: 'Derived From',
                  description: (
                    <EuiBadge color="hollow">
                      {skill.derived_from || 'patterns'}
                    </EuiBadge>
                  ),
                },
                {
                  title: 'Discovered',
                  description: new Date(skill.metadata?.created_at).toLocaleString(),
                },
                {
                  title: 'Source Indices',
                  description: (() => {
                    const indices = skill.source?.source_indices || skill.metadata?.source_indices || [];
                    if (indices.length === 0) return `${skill.metadata?.indices_explored ?? 0} indices (names not recorded)`;
                    return (
                      <EuiFlexGroup gutterSize="xs" wrap>
                        {indices.map((idx: string) => (
                          <EuiFlexItem key={idx} grow={false}>
                            <EuiBadge color="hollow">{idx}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    );
                  })(),
                },
              ]}
            />
          </EuiPanel>

          <EuiSpacer />

          {/* Review status banner for already-decided skills */}
          {skill.review?.status === 'rejected' && (
            <>
              <EuiCallOut title="This skill has been rejected" color="danger" iconType="cross">
                {skill.review.review_notes && <p>{skill.review.review_notes}</p>}
                {skill.review.reviewed_at && (
                  <EuiText size="xs" color="subdued">
                    Rejected by {skill.review.reviewed_by || 'unknown'} on{' '}
                    {new Date(skill.review.reviewed_at).toLocaleString()}
                  </EuiText>
                )}
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  color="warning"
                  onClick={() => unrejectMutation.mutate()}
                  isLoading={unrejectMutation.isPending}
                  aria-label={`Restore ${skill.name} to pending review`}
                >
                  Restore to Pending Review
                </EuiButton>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          {skill.review?.status === 'approved' && (
            <>
              <EuiCallOut title="This skill has been approved and deployed" color="success" iconType="check">
                {skill.review.review_notes && <p>{skill.review.review_notes}</p>}
                {skill.review.reviewed_at && (
                  <EuiText size="xs" color="subdued">
                    Approved by {skill.review.reviewed_by || 'unknown'} on{' '}
                    {new Date(skill.review.reviewed_at).toLocaleString()}
                  </EuiText>
                )}
                {skill.deployment?.agent_builder_skill_id && (
                  <EuiText size="xs" color="subdued">
                    Agent Builder skill ID: {skill.deployment.agent_builder_skill_id}
                  </EuiText>
                )}
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  iconType="refresh"
                  onClick={() => redeployMutation.mutate()}
                  isLoading={redeployMutation.isPending}
                  aria-label={`Re-deploy ${skill.name} to Agent Builder`}
                >
                  Re-deploy to Agent Builder
                </EuiButton>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {/* Review Notes — only for pending skills */}
          {isReviewable && (
            <EuiFormRow
              label="Review Notes (optional)"
              helpText="Add notes about this skill for the team"
            >
              <EuiTextArea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g., Approved for production use. Addresses common triage workflow."
                aria-label="Review notes for this skill"
              />
            </EuiFormRow>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          {isReviewable ? (
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiToolTip content={!reviewNotes.trim() ? 'Review notes are required to reject' : ''}>
                <EuiButtonEmpty
                  onClick={() => rejectMutation.mutate()}
                  color="danger"
                  isLoading={rejectMutation.isPending}
                  disabled={!reviewNotes.trim()}
                  aria-label={`Reject skill: ${skill.name}`}
                >
                  Reject
                </EuiButtonEmpty>
              </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={onClose} aria-label="Close skill review">
                      Cancel
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  {skill.base_skill && !skill.base_skill.readonly && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="success"
                        onClick={() => approveMutation.mutate({ updateExisting: true })}
                        disabled={!canApprove}
                        isLoading={approveMutation.isPending}
                        aria-label={`Update existing skill ${skill.base_skill?.name}`}
                      >
                        Update Existing Skill
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      color="success"
                      onClick={() => approveMutation.mutate()}
                      disabled={!canApprove}
                      isLoading={approveMutation.isPending}
                      aria-label={skill.base_skill ? `Create ${skill.name} as new skill in Agent Builder` : `Approve and deploy ${skill.name} to Agent Builder`}
                    >
                      {skill.base_skill ? 'Create as New Skill' : 'Approve & Deploy to Agent Builder'}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onClose} aria-label="Close skill review">Close</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlyoutFooter>
      </EuiFlyout>

    </>
  );
};
