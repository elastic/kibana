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
  EuiIconTip,
  EuiCheckbox,
  EuiSteps,
} from '@elastic/eui';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { IUiSettingsClient } from '@kbn/core/public';
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
      return data?.validation?.status === 'validating' || isValidating || isImproving
        ? 2000
        : false;
    },
  });

  const skill = polledSkill || initialSkill;

  // Clear local validating state when server confirms terminal status
  React.useEffect(() => {
    if (
      isValidating &&
      skill.validation?.status !== 'validating' &&
      skill.validation?.status !== 'pending'
    ) {
      setIsValidating(false);
    }
  }, [isValidating, skill.validation?.status]);

  const { data: connectors, isLoading: connectorsLoading } = useLLMConnectors();

  // Operator-configurable default via uiSettings.overrides in kibana.yml.
  // Same setting Agent Builder and the proposed-skills page honor, so a
  // single config controls all three flows.
  const { services } = useKibana<{ settings: { client: IUiSettingsClient } }>();
  const defaultConnectorId = services.settings?.client.get<string | undefined>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    undefined
  );

  // Auto-select strategy mirrors `proposed_skills_list.tsx`:
  //   1) honor `genAiSettings:defaultAIConnector` if available
  //   2) fall back to the first preconfigured connector (any provider)
  // The previous heuristic (first `.gen-ai`) silently picked DeepSeek-R1
  // over Bedrock/Anthropic defaults — fixed here for parity.
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  React.useEffect(() => {
    if (!connectors?.length || hasAutoSelected) return;

    if (defaultConnectorId && connectors.some((c) => c.id === defaultConnectorId)) {
      setSelectedConnectorId(defaultConnectorId);
      setHasAutoSelected(true);
      return;
    }

    const preconfigured = connectors.find((c) => c.isPreconfigured);
    setSelectedConnectorId(preconfigured?.id || connectors[0].id);
    setHasAutoSelected(true);
  }, [connectors, hasAutoSelected, defaultConnectorId]);

  // Surface a warning when the operator configured a default that does not
  // resolve to an available connector — otherwise the fallback above
  // silently overrides their choice.
  const defaultConnectorMissing = Boolean(
    defaultConnectorId && connectors?.length && !connectors.some((c) => c.id === defaultConnectorId)
  );

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

  // Proposed evaluators state — initialized from cached data on the skill doc
  const [proposedEvaluators, setProposedEvaluators] = useState<any[] | null>(
    () => (skill as any).proposed_evaluators_cache ?? null
  );
  const [expandedEvaluator, setExpandedEvaluator] = useState<string | null>(null);

  // Dataset selection state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('_generate');
  const skillDatasetName = `aesop-skill-eval:${skill.id}`;
  const { data: datasetsData } = useQuery({
    queryKey: ['evals', 'datasets', 'list'],
    queryFn: async () => {
      const result = await api.http.get('/internal/evals/datasets', {
        query: { page: 1, per_page: 100 },
        version: '1',
      });
      return result as { datasets: Array<{ id: string; name: string; description?: string }> };
    },
  });
  // Auto-select the skill's dataset if it exists
  React.useEffect(() => {
    if (datasetsData?.datasets && selectedDatasetId === '_generate') {
      const match = datasetsData.datasets.find((ds) => ds.name === skillDatasetName);
      if (match) setSelectedDatasetId(match.id);
    }
  }, [datasetsData, skillDatasetName, selectedDatasetId]);
  const datasetOptions = [
    {
      value: '_generate',
      inputDisplay: 'Auto-generate for this skill',
      dropdownDisplay: 'Auto-generate for this skill',
    },
    ...(datasetsData?.datasets ?? []).map((ds) => ({
      value: ds.id,
      inputDisplay: ds.name,
      dropdownDisplay: (
        <>
          <strong>{ds.name}</strong>
          {ds.description && (
            <EuiText size="xs" color="subdued">
              <p>{ds.description}</p>
            </EuiText>
          )}
        </>
      ),
    })),
  ];

  // Catalog evaluators — always fetched to check "new" vs existing
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const { data: catalogEvaluatorsData } = useQuery({
    queryKey: ['evals', 'evaluators', 'catalog'],
    queryFn: async () => {
      const result = await api.http.get('/internal/evals/evaluators', {
        version: '1',
      });
      return result as {
        evaluators: Array<{
          name: string;
          kind: string;
          type: string;
          description: string;
          source: string;
        }>;
      };
    },
  });
  const catalogEvaluatorNames = new Set(
    catalogEvaluatorsData?.evaluators?.map((e) => e.name) ?? []
  );

  const addCatalogEvaluator = (catalogEval: any) => {
    setProposedEvaluators((prev) => {
      const existing = prev ?? [];
      if (existing.some((e) => e.name === catalogEval.name)) return existing;
      return [
        ...existing,
        {
          name: catalogEval.name,
          description: catalogEval.description,
          kind: catalogEval.kind,
          type: catalogEval.type,
          source: catalogEval.source || 'prebuilt',
          selected: true,
          rationale: 'Added from evaluator catalog',
        },
      ];
    });
  };

  const toggleEvaluator = (name: string) => {
    setProposedEvaluators(
      (prev) => prev?.map((e) => (e.name === name ? { ...e, selected: !e.selected } : e)) ?? null
    );
  };

  // Propose evaluators mutation
  const proposeEvaluatorsMutation = useMutation({
    mutationFn: async () =>
      api.http.post(`/internal/aesop/skills/${skill.id}/propose-evaluators`, {
        body: JSON.stringify({ connector_id: selectedConnectorId }),
        version: '1',
      }),
    onSuccess: (result: any) => {
      setProposedEvaluators(result.proposed_evaluators);
      api.notifications.toasts.addSuccess(
        `${result.selected_count} evaluators proposed for "${skill.name}"`
      );
    },
    onError: (err: Error) =>
      api.notifications.toasts.addDanger(`Failed to propose evaluators: ${err.message}`),
  });

  // Save auto-generated evaluator to catalog
  const saveEvaluatorMutation = useMutation({
    mutationFn: async (evaluator: any) =>
      api.http.post('/internal/evals/evaluators/custom', {
        body: JSON.stringify({
          name: evaluator.name,
          description: evaluator.description,
          type: 'llm-judge',
          config: {
            prompt_template: evaluator.config.prompt_template,
            scoring_mode: evaluator.config.scoring_mode || 'continuous',
            feedback_key: evaluator.config.feedback_key || 'explanation',
          },
        }),
        version: '1',
      }),
    onSuccess: (_result: any, evaluator: any) => {
      api.notifications.toasts.addSuccess(`Evaluator "${evaluator.name}" saved to catalog`);
      // Refresh catalog so "new" badge becomes "saved"
      queryClient.invalidateQueries({ queryKey: ['evals', 'evaluators', 'catalog'] });
    },
    onError: (err: Error) =>
      api.notifications.toasts.addDanger(`Failed to save evaluator: ${err.message}`),
  });

  // Generate eval dataset mutation
  const generateDatasetMutation = useMutation({
    mutationFn: async () =>
      api.http.post(`/internal/aesop/skills/${skill.id}/generate-eval-dataset`, {
        body: JSON.stringify({ connector_id: selectedConnectorId, count: 10 }),
        version: '1',
      }),
    onSuccess: (result: any) => {
      api.notifications.toasts.addSuccess(`Dataset generated: ${result.added} test cases`);
      if (result.dataset_id) setSelectedDatasetId(result.dataset_id);
      queryClient.invalidateQueries({ queryKey: ['aesop'] });
      queryClient.invalidateQueries({ queryKey: ['evals', 'datasets', 'list'] });
    },
    onError: (err: Error) =>
      api.notifications.toasts.addDanger(`Failed to generate dataset: ${err.message}`),
  });

  // Run online eval mutation — passes selected evaluator names if available
  const runEvalMutation = useMutation({
    mutationFn: async () => {
      const selectedEvals = proposedEvaluators?.filter((e) => e.selected) ?? [];

      // Auto-save any unsaved auto-generated evaluators before running
      const unsaved = selectedEvals.filter(
        (e: any) => e.source === 'auto-generated' && e.config && !catalogEvaluatorNames.has(e.name)
      );
      for (const evaluator of unsaved) {
        try {
          await api.http.post('/internal/evals/evaluators/custom', {
            body: JSON.stringify({
              name: evaluator.name,
              description: evaluator.description,
              type: 'llm-judge',
              config: {
                prompt_template: evaluator.config.prompt_template,
                scoring_mode: evaluator.config.scoring_mode || 'continuous',
                feedback_key: evaluator.config.feedback_key || 'explanation',
              },
            }),
            version: '1',
          });
        } catch {
          // Already exists or save failed — evaluator may still be in registry from a previous save
        }
      }
      if (unsaved.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['evals', 'evaluators', 'catalog'] });
      }

      const selectedEvalNames = selectedEvals.map((e: any) => e.name);
      return api.http.post(`/internal/aesop/skills/${skill.id}/run-online-eval`, {
        body: JSON.stringify({
          connector_id: selectedConnectorId,
          ...(selectedEvalNames?.length ? { evaluator_names: selectedEvalNames } : {}),
        }),
        version: '1',
      });
    },
    onSuccess: (result: any) => {
      api.notifications.toasts.addSuccess(
        `Evaluation started with ${
          result.evaluators?.length ?? 0
        } evaluators. Results will appear in the Runs tab.`
      );
      // Poll for skill updates to detect when eval completes
      queryClient.invalidateQueries({ queryKey: ['aesop', 'skill-detail', initialSkill.id] });
      queryClient.invalidateQueries({ queryKey: ['aesop', 'proposed-skills'] });
      queryClient.invalidateQueries({ queryKey: ['evals', 'runs'] });
    },
    onError: (err: Error) => api.notifications.toasts.addDanger(`Eval failed: ${err.message}`),
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
      <EuiFlyout onClose={onClose} size="l" ownFocus outsideClickCloses={false}>
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
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem>
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
                  {defaultConnectorMissing && (
                    <EuiFlexItem grow={false}>
                      <EuiIconTip
                        type="warning"
                        color="warning"
                        aria-label="Configured default GenAI connector is unavailable"
                        content={`Your kibana.yml sets genAiSettings:defaultAIConnector="${defaultConnectorId}", but that connector is not available (deleted, disabled, or typo). Falling back to "${selectedConnectorId}". Update kibana.yml or pick another connector here.`}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {/* Top-level review workflow progress */}
          {isReviewable && (
            <>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {[
                  { step: 1, label: 'Review Content', done: true },
                  {
                    step: 2,
                    label: 'Validate',
                    done:
                      skill.validation?.status === 'passed' ||
                      skill.validation?.status === 'failed',
                  },
                  { step: 3, label: 'Evaluate', done: !!skill.eval_run },
                  { step: 4, label: 'Decide', done: skill.review?.status !== 'pending_review' },
                ].map(({ step, label, done }) => (
                  <EuiFlexItem key={step}>
                    <EuiPanel
                      paddingSize="xs"
                      color={done ? 'success' : 'subdued'}
                      hasBorder={false}
                      style={{ textAlign: 'center' }}
                    >
                      <EuiText size="xs">
                        <strong>
                          {done ? '\u2713' : step}. {label}
                        </strong>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}

          {/* ── Section 1: Skill Overview ───────────────────────────── */}
          {/* Skill Improvement info */}
          {skill.base_skill && (
            <>
              <EuiPanel color="accent">
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="s">
                      <h3>Based on: {skill.base_skill.name}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={skill.base_skill.readonly ? 'default' : 'primary'}>
                      {skill.base_skill.readonly ? 'Built-in Skill' : 'User Skill'}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {skill.source?.rationale ||
                    'Improvement proposed based on discovered data patterns.'}
                </EuiText>
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
              <EuiCallOut title="Applying LLM suggestions" color="primary" iconType="sparkles">
                <EuiProgress size="s" color="primary" />
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      The LLM is rewriting the skill based on validation feedback. This typically
                      takes 10-20 seconds.
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          {!isImproving && (isValidating || skill.validation?.status === 'validating') && (
            <>
              <EuiCallOut title="LLM validation in progress" color="primary" iconType="iInCircle">
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
          {/* ── Section 2: Content Validation ────────────────────────── */}
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
                        onClick={() => validateMutation.mutate(undefined)}
                        disabled={!selectedConnectorId}
                        aria-label={`Run validation for ${skill.name}`}
                      >
                        {skill.validation?.status === 'failed'
                          ? 'Re-run Validation'
                          : 'Run Validation'}
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
                    onClick={() => validateMutation.mutate(undefined)}
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

          {/* ── Section 3: Performance Evaluation ─────────────────────── */}
          {isReviewable && (
            <>
              <EuiTitle size="xs">
                <h3>Performance Evaluation</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiSteps
                steps={[
                  {
                    title: `Select Evaluators${
                      proposedEvaluators?.length
                        ? ` (${proposedEvaluators.filter((e: any) => e.selected).length} selected)`
                        : ''
                    }`,
                    status: proposedEvaluators?.length
                      ? 'complete'
                      : proposeEvaluatorsMutation.isLoading
                      ? 'loading'
                      : 'incomplete',
                    children: (
                      <>
                        {proposedEvaluators && proposedEvaluators.length > 0 ? (
                          <>
                            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                              {proposedEvaluators.map((evaluator: any) => (
                                <EuiPanel
                                  key={evaluator.name}
                                  paddingSize="s"
                                  hasBorder
                                  style={{ marginBottom: 6 }}
                                  color={evaluator.selected ? 'plain' : 'subdued'}
                                >
                                  <EuiFlexGroup
                                    gutterSize="s"
                                    alignItems="center"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <EuiCheckbox
                                        id={`eval-${evaluator.name}`}
                                        checked={evaluator.selected}
                                        onChange={() => toggleEvaluator(evaluator.name)}
                                      />
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiBadge
                                        color={
                                          evaluator.source === 'auto-generated' &&
                                          !catalogEvaluatorNames.has(evaluator.name)
                                            ? 'accent'
                                            : 'hollow'
                                        }
                                      >
                                        {evaluator.kind}
                                      </EuiBadge>
                                    </EuiFlexItem>
                                    <EuiFlexItem>
                                      <EuiText size="xs">
                                        <strong>{evaluator.name}</strong>
                                        {evaluator.source === 'auto-generated' &&
                                          !catalogEvaluatorNames.has(evaluator.name) && (
                                            <EuiBadge color="accent" style={{ marginLeft: 4 }}>
                                              new
                                            </EuiBadge>
                                          )}
                                        {catalogEvaluatorNames.has(evaluator.name) &&
                                          evaluator.source === 'auto-generated' && (
                                            <EuiBadge color="success" style={{ marginLeft: 4 }}>
                                              saved
                                            </EuiBadge>
                                          )}
                                      </EuiText>
                                    </EuiFlexItem>
                                    {evaluator.source === 'auto-generated' &&
                                      evaluator.config &&
                                      !catalogEvaluatorNames.has(evaluator.name) && (
                                        <EuiFlexItem grow={false}>
                                          <EuiFlexGroup gutterSize="xs" responsive={false}>
                                            <EuiFlexItem grow={false}>
                                              <EuiButtonEmpty
                                                size="xs"
                                                iconType="save"
                                                onClick={() =>
                                                  saveEvaluatorMutation.mutate(evaluator)
                                                }
                                              >
                                                Save
                                              </EuiButtonEmpty>
                                            </EuiFlexItem>
                                            <EuiFlexItem grow={false}>
                                              <EuiButtonEmpty
                                                size="xs"
                                                iconType={
                                                  expandedEvaluator === evaluator.name
                                                    ? 'arrowUp'
                                                    : 'eye'
                                                }
                                                onClick={() =>
                                                  setExpandedEvaluator(
                                                    expandedEvaluator === evaluator.name
                                                      ? null
                                                      : evaluator.name
                                                  )
                                                }
                                              >
                                                {expandedEvaluator === evaluator.name
                                                  ? 'Hide'
                                                  : 'Preview'}
                                              </EuiButtonEmpty>
                                            </EuiFlexItem>
                                          </EuiFlexGroup>
                                        </EuiFlexItem>
                                      )}
                                  </EuiFlexGroup>
                                  {evaluator.description && (
                                    <EuiText
                                      size="xs"
                                      color="subdued"
                                      style={{ marginTop: 2, paddingLeft: 28 }}
                                    >
                                      {evaluator.description}
                                    </EuiText>
                                  )}
                                  {evaluator.rationale &&
                                    evaluator.rationale !== evaluator.description && (
                                      <EuiText
                                        size="xs"
                                        color="subdued"
                                        style={{
                                          marginTop: 2,
                                          paddingLeft: 28,
                                          fontStyle: 'italic',
                                        }}
                                      >
                                        {evaluator.rationale}
                                      </EuiText>
                                    )}
                                  {expandedEvaluator === evaluator.name &&
                                    evaluator.config?.prompt_template && (
                                      <>
                                        <EuiSpacer size="xs" />
                                        <EuiCodeBlock
                                          language="markdown"
                                          paddingSize="s"
                                          fontSize="s"
                                          overflowHeight={200}
                                          isCopyable
                                        >
                                          {evaluator.config.prompt_template}
                                        </EuiCodeBlock>
                                      </>
                                    )}
                                </EuiPanel>
                              ))}
                            </div>
                            <EuiButtonEmpty
                              size="xs"
                              iconType={showCatalogPicker ? 'arrowUp' : 'plusInCircle'}
                              onClick={() => setShowCatalogPicker(!showCatalogPicker)}
                            >
                              {showCatalogPicker ? 'Hide catalog' : 'Add from catalog'}
                            </EuiButtonEmpty>
                            {showCatalogPicker && catalogEvaluatorsData?.evaluators && (
                              <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 4 }}>
                                {catalogEvaluatorsData.evaluators
                                  .filter(
                                    (ce) => !proposedEvaluators?.some((pe) => pe.name === ce.name)
                                  )
                                  .map((catalogEval) => (
                                    <EuiFlexGroup
                                      key={catalogEval.name}
                                      gutterSize="s"
                                      alignItems="center"
                                      responsive={false}
                                      style={{ marginBottom: 4 }}
                                    >
                                      <EuiFlexItem grow={false}>
                                        <EuiBadge color="hollow">{catalogEval.kind}</EuiBadge>
                                      </EuiFlexItem>
                                      <EuiFlexItem>
                                        <EuiToolTip content={catalogEval.description}>
                                          <EuiText size="xs">{catalogEval.name}</EuiText>
                                        </EuiToolTip>
                                      </EuiFlexItem>
                                      <EuiFlexItem grow={false}>
                                        <EuiButtonEmpty
                                          size="xs"
                                          iconType="plusInCircle"
                                          onClick={() => addCatalogEvaluator(catalogEval)}
                                        >
                                          Add
                                        </EuiButtonEmpty>
                                      </EuiFlexItem>
                                    </EuiFlexGroup>
                                  ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <EuiButton
                            size="s"
                            onClick={() => proposeEvaluatorsMutation.mutate()}
                            isLoading={proposeEvaluatorsMutation.isLoading}
                            disabled={!selectedConnectorId}
                            iconType="inspect"
                          >
                            Propose Evaluators
                          </EuiButton>
                        )}
                      </>
                    ),
                  },
                  {
                    title: 'Choose Dataset',
                    status:
                      selectedDatasetId !== '_generate' || generateDatasetMutation.isSuccess
                        ? 'complete'
                        : generateDatasetMutation.isLoading
                        ? 'loading'
                        : 'incomplete',
                    children: (
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem>
                          <EuiSuperSelect
                            options={datasetOptions}
                            valueOfSelected={selectedDatasetId}
                            onChange={setSelectedDatasetId}
                            compressed
                            aria-label="Select evaluation dataset"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            size="s"
                            onClick={() => generateDatasetMutation.mutate()}
                            isLoading={generateDatasetMutation.isLoading}
                            disabled={!selectedConnectorId}
                            iconType="sparkles"
                          >
                            Generate
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  },
                  {
                    title: `Run Evaluation${
                      (skill as any).eval_run?.status === 'completed'
                        ? ` — ${((skill as any).eval_run.mean_score * 100).toFixed(0)}% mean score`
                        : (skill as any).eval_run?.status === 'running'
                        ? ' — running...'
                        : ''
                    }`,
                    status:
                      (skill as any).eval_run?.status === 'completed' || runEvalMutation.isSuccess
                        ? 'complete'
                        : (skill as any).eval_run?.status === 'running' || runEvalMutation.isLoading
                        ? 'loading'
                        : (skill as any).eval_run?.status === 'failed'
                        ? ('danger' as any)
                        : 'incomplete',
                    children: (
                      <EuiButton
                        size="s"
                        fill
                        onClick={() => runEvalMutation.mutate()}
                        isLoading={runEvalMutation.isLoading}
                        disabled={
                          !selectedConnectorId ||
                          (!proposedEvaluators?.length && selectedDatasetId === '_generate')
                        }
                        iconType="play"
                      >
                        Run Eval
                        {proposedEvaluators?.filter((e: any) => e.selected).length
                          ? ` with ${
                              proposedEvaluators.filter((e: any) => e.selected).length
                            } evaluators`
                          : ''}
                      </EuiButton>
                    ),
                  },
                ]}
              />
              <EuiSpacer />
            </>
          )}

          {/* ── Section 4: Results ────────────────────────────────────── */}
          {/* Evaluation Score + LLM Feedback — hidden during re-validation or improvement */}
          {skill.validation?.final_score != null &&
            !isValidating &&
            !isImproving &&
            skill.validation?.status !== 'validating' && (
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

                {/* Criteria Breakdown — with evaluator descriptions */}
                {skill.validation.criteria && (
                  <>
                    <EuiPanel>
                      <EuiTitle size="xs">
                        <h4>Evaluation Criteria</h4>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      {Object.entries(skill.validation.criteria as Record<string, number>).map(
                        ([criterion, score]) => {
                          const evalDescriptions: Record<string, string> = {
                            safety:
                              'Detects destructive patterns (DELETE, DROP, _delete_by_query) and unsafe operations',
                            accuracy:
                              'Validates ES|QL syntax, ECS field names, and index pattern correctness',
                            completeness:
                              'Checks for step-by-step instructions, ES|QL examples, data sources, and error handling',
                            specificity:
                              'Evaluates whether a junior analyst can follow the skill step-by-step',
                            relevance: 'Assesses utility for SOC/security analyst workflows',
                          };
                          return (
                            <EuiFlexGroup
                              key={criterion}
                              gutterSize="s"
                              alignItems="center"
                              responsive={false}
                              style={{ marginBottom: 8 }}
                            >
                              <EuiFlexItem grow={false} style={{ minWidth: 70 }}>
                                <EuiBadge
                                  color={
                                    score >= 0.85 ? 'success' : score >= 0.6 ? 'warning' : 'danger'
                                  }
                                >
                                  {(score * 100).toFixed(0)}%
                                </EuiBadge>
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText size="s">
                                  <strong>
                                    {criterion.charAt(0).toUpperCase() + criterion.slice(1)}
                                  </strong>
                                </EuiText>
                                <EuiText size="xs" color="subdued">
                                  {evalDescriptions[criterion.toLowerCase()] ||
                                    `Evaluates skill ${criterion}`}
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          );
                        }
                      )}
                    </EuiPanel>
                    <EuiSpacer size="s" />
                  </>
                )}

                {/* LLM Feedback */}
                {skill.validation.llm_feedback && (
                  <EuiPanel>
                    <EuiTitle size="xs">
                      <h4>LLM Feedback</h4>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText size="s">{skill.validation.llm_feedback}</EuiText>

                    {skill.validation.strengths?.length > 0 && (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText size="xs">
                          <strong>Strengths</strong>
                        </EuiText>
                        <ul>
                          {skill.validation.strengths.map((s: string, i: number) => (
                            <li key={i}>
                              <EuiText size="xs">{s}</EuiText>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {skill.validation.weaknesses?.length > 0 && (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText size="xs">
                          <strong>Weaknesses</strong>
                        </EuiText>
                        <ul>
                          {skill.validation.weaknesses.map((w: string, i: number) => (
                            <li key={i}>
                              <EuiText size="xs">{w}</EuiText>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {skill.validation.suggestions?.length > 0 && (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText size="xs">
                          <strong>Suggestions</strong>
                        </EuiText>
                        <ul>
                          {skill.validation.suggestions.map((s: string, i: number) => (
                            <li key={i}>
                              <EuiText size="xs">{s}</EuiText>
                            </li>
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
                          isLoading={improveMutation.isLoading}
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

          {/* ── Section 5: Skill Content ──────────────────────────────── */}
          {/* Skill Content — view or edit */}
          <EuiPanel>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>Skill Content</h3>
                </EuiTitle>
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
                          isLoading={saveMutation.isLoading}
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
            <EuiTitle size="s">
              <h3>Discovery Source</h3>
            </EuiTitle>
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
                    <EuiBadge color="hollow">{skill.derived_from || 'patterns'}</EuiBadge>
                  ),
                },
                {
                  title: 'Discovered',
                  description: new Date(skill.metadata?.created_at).toLocaleString(),
                },
                {
                  title: 'Source Indices',
                  description: (() => {
                    const indices =
                      skill.source?.source_indices || skill.metadata?.source_indices || [];
                    if (indices.length === 0)
                      return `${
                        skill.metadata?.indices_explored ?? 0
                      } indices (names not recorded)`;
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
                  isLoading={unrejectMutation.isLoading}
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
              <EuiCallOut
                title="This skill has been approved and deployed"
                color="success"
                iconType="check"
              >
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
                  isLoading={redeployMutation.isLoading}
                  aria-label={`Re-deploy ${skill.name} to Agent Builder`}
                >
                  Re-deploy to Agent Builder
                </EuiButton>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {/* ── Section 6: Review Decision ──────────────────────────── */}
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
          {/* Evaluator preview removed — now inline in evaluator cards */}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          {isReviewable ? (
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={!reviewNotes.trim() ? 'Review notes are required to reject' : ''}
                >
                  <EuiButtonEmpty
                    onClick={() => rejectMutation.mutate()}
                    color="danger"
                    isLoading={rejectMutation.isLoading}
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
                        isLoading={approveMutation.isLoading}
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
                      onClick={() => approveMutation.mutate(undefined)}
                      disabled={!canApprove}
                      isLoading={approveMutation.isLoading}
                      aria-label={
                        skill.base_skill
                          ? `Create ${skill.name} as new skill in Agent Builder`
                          : `Approve and deploy ${skill.name} to Agent Builder`
                      }
                    >
                      {skill.base_skill
                        ? 'Create as New Skill'
                        : 'Approve & Deploy to Agent Builder'}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onClose} aria-label="Close skill review">
                  Close
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
