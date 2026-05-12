/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiProgress,
  EuiSelectable,
  EuiSpacer,
  EuiStat,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { EvalResults } from './types';
import type { AesopSkillSuggestion } from './use_aesop_suggestions';
import { SkillImprovementDiffFlyout } from './skill_improvement_diff_flyout';
import { useKibana } from '../../hooks/use_kibana';

interface ProposedEvaluator {
  name: string;
  description: string;
  kind: 'LLM' | 'CODE';
  type: 'llm-judge' | 'code' | 'esql' | 'prebuilt';
  source: 'prebuilt' | 'auto-generated';
  selected: boolean;
  config?: {
    prompt_template?: string;
    scoring_mode?: string;
    feedback_key?: string;
  };
  rationale: string;
}

interface DatasetStatus {
  exists: boolean;
  dataset_id?: string;
  dataset_name: string;
  examples_count: number;
}

interface DatasetListItem {
  id: string;
  name: string;
  examples_count?: number;
}

interface DatasetDetail {
  id: string;
  name: string;
  examples: Array<{
    id: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
}

interface Connector {
  id: string;
  name: string;
  connector_type_id: string;
  is_preconfigured: boolean;
  is_missing_secrets: boolean;
}

interface OnlineEvalRun {
  runId: string;
  skillId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress: { completed: number; total: number };
  summary?: {
    meanScore: number;
    passRate: number;
    examplesRan: number;
    examplesSkipped: number;
    durationMs: number;
  };
  evaluatorScores?: Array<{
    name: string;
    meanScore: number;
    passCount: number;
    failCount: number;
  }>;
  error?: string;
}

interface ImprovementSuggestions {
  analysis: string;
  weaknesses: string[];
  suggestions: string[];
  focus_areas: string[];
}

interface GeneratedImprovement {
  improved_name: string;
  improved_description: string;
  improved_content: string;
  changes_summary: string;
  suggestions: string[];
}

interface SkillEvalSectionProps {
  skillId: string;
  connectorId: string;
  http: HttpSetup;
  skillName: string;
  skillContent: string;
  isReadonly: boolean;
  aesopSuggestion?: AesopSkillSuggestion;
  onOpenChat?: (evalResults?: EvalResults) => void;
  onApplyImprovement?: (data: { name: string; description: string; content: string }) => void;
}

const KIND_BADGE_COLORS: Record<string, string> = {
  LLM: 'accent',
  CODE: 'primary',
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  prebuilt: 'hollow',
  'auto-generated': 'warning',
};

const GEN_AI_CONNECTOR_TYPES = ['.gen-ai', '.bedrock', '.gemini'] as const;

const evaluatorListStyles = css`
  max-height: 300px;
  overflow-y: auto;
`;

const previewTableStyles = css`
  max-height: 300px;
  overflow-y: auto;
`;

const catalogPopoverStyles = css`
  width: 380px;
`;

export const SkillEvalSection: React.FC<SkillEvalSectionProps> = ({
  skillId,
  connectorId: chatPanelConnectorId,
  http,
  skillName,
  skillContent,
  isReadonly,
  aesopSuggestion,
  onOpenChat,
  onApplyImprovement,
}) => {
  const queryClient = useQueryClient();
  const {
    services: { notifications },
  } = useKibana();

  // Extracts a readable message from a Kibana http fetch error. The server
  // puts the real message on `body.message`; falls back to the generic
  // Error.message so we never silently swallow a failure.
  const getErrorMessage = useCallback((err: unknown): string => {
    const httpErr = err as IHttpFetchError<ResponseErrorBody> | undefined;
    return (
      httpErr?.body?.message ||
      (err instanceof Error ? err.message : undefined) ||
      i18n.translate('xpack.agentBuilder.skills.eval.unknownError', {
        defaultMessage: 'Unknown error',
      })
    );
  }, []);

  const showErrorToast = useCallback(
    (titleMessage: string, err: unknown) => {
      notifications?.toasts.addDanger({
        title: titleMessage,
        text: getErrorMessage(err),
      });
    },
    [notifications, getErrorMessage]
  );

  // ─── Local state ──────────────────────────────────────────────
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [evaluators, setEvaluators] = useState<ProposedEvaluator[]>([]);
  const [evaluatorsLoading, setEvaluatorsLoading] = useState(false);
  const [droppedEvaluators, setDroppedEvaluators] = useState<string[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [improvementSuggestions, setImprovementSuggestions] =
    useState<ImprovementSuggestions | null>(null);
  const suggestionsRequestedForRunRef = useRef<string | null>(null);
  const [generatedImprovement, setGeneratedImprovement] = useState<GeneratedImprovement | null>(
    null
  );
  const aesopPopulatedForRef = useRef<string | null>(null);
  const [isDiffFlyoutOpen, setIsDiffFlyoutOpen] = useState(false);

  // Auto-populate from AESOP proposed content when available.
  // Track which proposed skill ID we've already populated for to avoid
  // re-populating after the user dismisses.
  const aesopHasContent = Boolean(aesopSuggestion?.proposedContent);
  useEffect(() => {
    if (
      aesopSuggestion?.proposedContent &&
      aesopPopulatedForRef.current !== aesopSuggestion.proposedSkillId
    ) {
      aesopPopulatedForRef.current = aesopSuggestion.proposedSkillId;
      setGeneratedImprovement({
        improved_name: aesopSuggestion.proposedSkillName,
        improved_description: aesopSuggestion.proposedDescription,
        improved_content: aesopSuggestion.proposedContent,
        changes_summary: i18n.translate('xpack.agentBuilder.skills.eval.aesopImprovementSummary', {
          defaultMessage: 'AESOP-generated improvement with {confidence}% confidence{score}.',
          values: {
            confidence: (aesopSuggestion.confidence * 100).toFixed(0),
            score:
              aesopSuggestion.validationScore != null
                ? ` and ${(aesopSuggestion.validationScore * 100).toFixed(0)}% validation score`
                : '',
          },
        }),
        suggestions: [
          ...aesopSuggestion.weaknesses.map((w) => `Fix: ${w}`),
          ...aesopSuggestion.suggestions,
        ],
      });
    }
  }, [aesopSuggestion]);

  // ─── Connector picker ─────────────────────────────────────────
  const { data: connectors = [] } = useQuery({
    queryKey: ['evals-connectors'],
    queryFn: () => http.get<Connector[]>('/api/actions/connectors'),
    onSuccess: (data: Connector[]) => {
      if (!selectedConnectorId) {
        // Default to chat panel connector if it's a gen-ai type, else first gen-ai connector
        const genAiConnectors = data.filter((c) =>
          GEN_AI_CONNECTOR_TYPES.some((t) => c.connector_type_id === t)
        );
        const chatPanelMatch = genAiConnectors.find((c) => c.id === chatPanelConnectorId);
        const defaultId = chatPanelMatch?.id ?? genAiConnectors[0]?.id ?? '';
        setSelectedConnectorId(defaultId);
      }
    },
  });

  const genAiConnectors = useMemo(
    () => connectors.filter((c) => GEN_AI_CONNECTOR_TYPES.some((t) => c.connector_type_id === t)),
    [connectors]
  );

  const connectorOptions = useMemo(
    () =>
      genAiConnectors.map((c) => ({
        value: c.id,
        inputDisplay: c.name,
        dropdownDisplay: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{c.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{c.connector_type_id}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      })),
    [genAiConnectors]
  );

  // ─── Dataset status (for this skill's auto-dataset) ───────────
  const { data: datasetStatus } = useQuery({
    queryKey: ['evals-dataset-status', skillId],
    queryFn: () =>
      http.get<DatasetStatus>(
        `/internal/evals/skills/${encodeURIComponent(skillId)}/dataset-status`,
        { version: '1' }
      ),
    onSuccess: (data: DatasetStatus) => {
      // Auto-select this skill's dataset if available and nothing else selected
      if (data.exists && data.dataset_id && !selectedDatasetId) {
        setSelectedDatasetId(data.dataset_id);
      }
    },
  });

  // ─── Dataset list (for picker) ────────────────────────────────
  const { data: datasetList } = useQuery({
    queryKey: ['evals-datasets-list'],
    queryFn: async () => {
      const result = await http.get<{ datasets: DatasetListItem[] }>('/internal/evals/datasets', {
        query: { page: 1, per_page: 100 },
        version: '1',
      });
      return result.datasets ?? [];
    },
  });

  const datasetOptions = useMemo(() => {
    const items: Array<{
      value: string;
      inputDisplay: React.ReactNode;
      dropdownDisplay: React.ReactNode;
    }> = [];

    // Skill's own dataset first (if it exists)
    if (datasetStatus?.exists && datasetStatus.dataset_id) {
      items.push({
        value: datasetStatus.dataset_id,
        inputDisplay: `${datasetStatus.dataset_name} (${datasetStatus.examples_count})`,
        dropdownDisplay: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{datasetStatus.dataset_name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">{datasetStatus.examples_count} examples</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      });
    }

    // Other datasets
    if (datasetList) {
      for (const ds of datasetList) {
        // Skip the skill's own dataset (already added above)
        if (datasetStatus?.dataset_id && ds.id === datasetStatus.dataset_id) continue;
        items.push({
          value: ds.id,
          inputDisplay: `${ds.name} (${ds.examples_count ?? '?'})`,
          dropdownDisplay: (
            <EuiText size="s">
              {ds.name}
              {ds.examples_count != null ? ` — ${ds.examples_count} examples` : ''}
            </EuiText>
          ),
        });
      }
    }

    return items;
  }, [datasetStatus, datasetList]);

  // ─── Dataset preview ──────────────────────────────────────────
  const { data: datasetPreview, isLoading: previewLoading } = useQuery({
    queryKey: ['evals-dataset-preview', selectedDatasetId],
    queryFn: () =>
      http.get<DatasetDetail>(`/internal/evals/datasets/${encodeURIComponent(selectedDatasetId)}`, {
        version: '1',
      }),
    enabled: showPreview && !!selectedDatasetId,
  });

  type DatasetExample = DatasetDetail['examples'][number];

  const previewColumns = useMemo(
    (): Array<EuiBasicTableColumn<DatasetExample>> => [
      {
        field: 'input',
        name: i18n.translate('xpack.agentBuilder.skills.eval.previewInputColumn', {
          defaultMessage: 'Input',
        }),
        truncateText: true,
        render: (input: Record<string, unknown>) => {
          const text = (input?.query as string) ?? JSON.stringify(input);
          return (
            <EuiToolTip content={text}>
              <EuiText size="xs">{text}</EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'output',
        name: i18n.translate('xpack.agentBuilder.skills.eval.previewExpectedColumn', {
          defaultMessage: 'Expected Output',
        }),
        truncateText: true,
        render: (output: unknown) => {
          const text = typeof output === 'string' ? output : JSON.stringify(output);
          return (
            <EuiToolTip content={text}>
              <EuiText size="xs">{text}</EuiText>
            </EuiToolTip>
          );
        },
      },
    ],
    []
  );

  // ─── Evaluator suggestions (on-demand) ────────────────────────
  const fetchProposedEvaluators = useCallback(async () => {
    if (!selectedConnectorId) return;
    setEvaluatorsLoading(true);
    try {
      const result = await http.post<{ proposed_evaluators: ProposedEvaluator[] }>(
        `/internal/evals/skills/${encodeURIComponent(skillId)}/propose-evaluators`,
        {
          body: JSON.stringify({ connector_id: selectedConnectorId }),
          version: '1',
        }
      );
      setEvaluators(result.proposed_evaluators ?? []);
    } catch {
      setEvaluators([]);
    } finally {
      setEvaluatorsLoading(false);
    }
  }, [http, skillId, selectedConnectorId]);

  const toggleEvaluator = useCallback((name: string) => {
    setEvaluators((prev) =>
      prev.map((e) => (e.name === name ? { ...e, selected: !e.selected } : e))
    );
  }, []);

  const selectedEvaluatorNames = useMemo(
    () => evaluators.filter((e) => e.selected).map((e) => e.name),
    [evaluators]
  );

  // ─── Catalog picker (manual selection, no LLM) ────────────────
  const [isCatalogPopoverOpen, setIsCatalogPopoverOpen] = useState(false);

  interface CatalogEvaluator {
    id: string;
    name: string;
    kind: 'LLM' | 'CODE';
    type: 'llm-judge' | 'code' | 'esql' | 'prebuilt';
    description: string;
    source: 'prebuilt' | 'custom';
  }

  const { data: catalogEvaluators = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['evals-evaluators-catalog'],
    queryFn: async () => {
      const result = await http.get<{ evaluators: CatalogEvaluator[] }>(
        '/internal/evals/evaluators',
        { version: '1' }
      );
      return result.evaluators ?? [];
    },
    enabled: isCatalogPopoverOpen,
  });

  const catalogOptions = useMemo<Array<EuiSelectableOption<{ evaluator: CatalogEvaluator }>>>(
    () =>
      catalogEvaluators.map((e) => {
        const existing = evaluators.find((ev) => ev.name === e.name);
        return {
          label: e.name,
          key: e.name,
          checked: existing?.selected ? 'on' : undefined,
          'data-test-subj': `agentBuilderSkillEvalCatalog-${e.name}`,
          append: (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={KIND_BADGE_COLORS[e.kind] ?? 'hollow'}>{e.kind}</EuiBadge>
              </EuiFlexItem>
              {e.source === 'custom' && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.agentBuilder.skills.eval.catalogCustomBadge', {
                      defaultMessage: 'Custom',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ),
          toolTipContent: e.description,
          evaluator: e,
        };
      }),
    [catalogEvaluators, evaluators]
  );

  const handleCatalogSelectionChange = useCallback(
    (newOptions: Array<EuiSelectableOption<{ evaluator: CatalogEvaluator }>>) => {
      setEvaluators((prev) => {
        const next = [...prev];
        for (const option of newOptions) {
          const isOn = option.checked === 'on';
          const idx = next.findIndex((ev) => ev.name === option.evaluator.name);

          if (idx >= 0) {
            // Update selection state for existing evaluator (toggle without removing)
            if (next[idx].selected !== isOn) {
              next[idx] = { ...next[idx], selected: isOn };
            }
          } else if (isOn) {
            // Add newly picked evaluator
            const cat = option.evaluator;
            next.push({
              name: cat.name,
              description: cat.description,
              kind: cat.kind,
              type: cat.type,
              // Catalog items are already registered; mark as prebuilt so we
              // skip the auto-save-to-custom flow in runEvalMutation.
              source: 'prebuilt',
              selected: true,
              rationale: i18n.translate(
                'xpack.agentBuilder.skills.eval.manuallyPickedRationale',
                { defaultMessage: 'Manually selected from catalog.' }
              ),
            });
          }
        }
        return next;
      });
    },
    []
  );

  // ─── Generate dataset mutation ────────────────────────────────
  const generateDatasetMutation = useMutation({
    mutationFn: async () =>
      http.post(`/internal/evals/skills/${encodeURIComponent(skillId)}/generate-eval-dataset`, {
        body: JSON.stringify({ connector_id: selectedConnectorId, count: 10 }),
        version: '1',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evals-dataset-status', skillId] });
      queryClient.invalidateQueries({ queryKey: ['evals-datasets-list'] });
    },
    onError: (err) => {
      showErrorToast(
        i18n.translate('xpack.agentBuilder.skills.eval.generateDatasetErrorTitle', {
          defaultMessage: 'Failed to generate evaluation dataset',
        }),
        err
      );
    },
  });

  // ─── Run eval mutation ────────────────────────────────────────
  const runEvalMutation = useMutation({
    mutationFn: async () => {
      // Auto-save custom evaluators to the registry before running.
      // Without this, custom (auto-generated) evaluators only exist in frontend
      // state and get dropped by the backend registry filter.
      const customSelected = evaluators.filter(
        (e) => e.selected && e.source === 'auto-generated' && e.config
      );

      for (const evaluator of customSelected) {
        try {
          await http.post('/internal/evals/evaluators/custom', {
            body: JSON.stringify({
              name: evaluator.name,
              description: evaluator.description,
              type: evaluator.type,
              config: evaluator.config,
            }),
            version: '1',
          });
        } catch {
          // 409 = already exists, which is fine — skip silently
        }
      }

      return http.post<{
        status: string;
        run_id: string;
        evaluators: string[];
        dropped_evaluators: string[];
      }>(`/internal/evals/skills/${encodeURIComponent(skillId)}/run-online-eval`, {
        body: JSON.stringify({
          connector_id: selectedConnectorId,
          evaluator_names: selectedEvaluatorNames,
        }),
        version: '1',
      });
    },
    onSuccess: (result) => {
      setActiveRunId(result.run_id);
      setDroppedEvaluators(result.dropped_evaluators ?? []);
    },
    onError: (err) => {
      showErrorToast(
        i18n.translate('xpack.agentBuilder.skills.eval.runEvalErrorTitle', {
          defaultMessage: 'Failed to start evaluation run',
        }),
        err
      );
    },
  });

  // ─── Progress polling ─────────────────────────────────────────
  const { data: evalRunStatus } = useQuery({
    queryKey: ['evals-online-eval-status', skillId, activeRunId],
    queryFn: () =>
      http.get<{ run: OnlineEvalRun | null }>(
        `/internal/evals/skills/${encodeURIComponent(skillId)}/online-eval-status`,
        {
          query: activeRunId ? { run_id: activeRunId } : undefined,
          version: '1',
        }
      ),
    enabled: !!activeRunId,
    refetchInterval: (data) => {
      if (data?.run?.status === 'running') return 3000;
      return false;
    },
  });

  const currentRun = evalRunStatus?.run;
  const isRunning = currentRun?.status === 'running';
  const isCompleted = currentRun?.status === 'completed';
  const isFailed = currentRun?.status === 'failed';

  // ─── Results table columns ────────────────────────────────────
  const evaluatorResultColumns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.agentBuilder.skills.eval.resultEvaluatorColumn', {
          defaultMessage: 'Evaluator',
        }),
      },
      {
        field: 'meanScore',
        name: i18n.translate('xpack.agentBuilder.skills.eval.resultScoreColumn', {
          defaultMessage: 'Mean Score',
        }),
        render: (score: number) => (
          <EuiBadge color={score >= 0.7 ? 'success' : 'danger'}>{score.toFixed(2)}</EuiBadge>
        ),
      },
      {
        field: 'passCount',
        name: i18n.translate('xpack.agentBuilder.skills.eval.resultPassColumn', {
          defaultMessage: 'Pass',
        }),
        render: (count: number) => <EuiBadge color="success">{count}</EuiBadge>,
      },
      {
        field: 'failCount',
        name: i18n.translate('xpack.agentBuilder.skills.eval.resultFailColumn', {
          defaultMessage: 'Fail',
        }),
        render: (count: number) =>
          count > 0 ? <EuiBadge color="danger">{count}</EuiBadge> : <EuiBadge>{count}</EuiBadge>,
      },
    ],
    []
  );

  // ─── Open chat with eval context ──────────────────────────────
  const handleImproveWithChat = useCallback(() => {
    if (!onOpenChat || !currentRun?.summary) return;
    onOpenChat({
      summary: {
        meanScore: currentRun.summary.meanScore,
        passRate: currentRun.summary.passRate,
        examplesRan: currentRun.summary.examplesRan,
      },
      evaluatorScores: currentRun.evaluatorScores ?? [],
    });
  }, [onOpenChat, currentRun]);

  // ─── Improvement suggestions (auto-triggered on eval complete) ─
  const suggestImprovementsMutation = useMutation({
    mutationFn: async () => {
      if (!currentRun?.summary || !currentRun.evaluatorScores) {
        throw new Error('No eval results available');
      }

      return http.post<ImprovementSuggestions>(
        `/internal/evals/skills/${encodeURIComponent(skillId)}/suggest-improvements`,
        {
          body: JSON.stringify({
            connector_id: selectedConnectorId,
            eval_summary: {
              meanScore: currentRun.summary.meanScore,
              passRate: currentRun.summary.passRate,
              examplesRan: currentRun.summary.examplesRan,
            },
            evaluator_scores: currentRun.evaluatorScores,
          }),
          version: '1',
        }
      );
    },
    onSuccess: (data) => {
      setImprovementSuggestions(data);
    },
    onError: (err) => {
      showErrorToast(
        i18n.translate('xpack.agentBuilder.skills.eval.suggestImprovementsErrorTitle', {
          defaultMessage: 'Failed to suggest improvements',
        }),
        err
      );
    },
  });

  // Auto-trigger improvement suggestions when eval completes
  const { mutate: suggestImprovements } = suggestImprovementsMutation;
  useEffect(() => {
    if (
      isCompleted &&
      currentRun?.runId &&
      currentRun.summary &&
      currentRun.evaluatorScores?.length &&
      selectedConnectorId &&
      suggestionsRequestedForRunRef.current !== currentRun.runId
    ) {
      suggestionsRequestedForRunRef.current = currentRun.runId;
      setImprovementSuggestions(null);
      suggestImprovements();
    }
  }, [isCompleted, currentRun, selectedConnectorId, suggestImprovements]);

  // ─── Generate full improvement (on-demand) ────────────────────
  const generateImprovementMutation = useMutation({
    mutationFn: async ({ fromAesop }: { fromAesop?: boolean } = {}) => {
      const body: Record<string, unknown> = { connector_id: selectedConnectorId };

      if (fromAesop && aesopSuggestion) {
        // Use AESOP findings directly — no eval run required
        body.aesop_weaknesses = aesopSuggestion.weaknesses;
        body.aesop_suggestions = aesopSuggestion.suggestions;
      } else if (currentRun?.summary && currentRun.evaluatorScores) {
        body.eval_summary = {
          meanScore: currentRun.summary.meanScore,
          passRate: currentRun.summary.passRate,
          examplesRan: currentRun.summary.examplesRan,
        };
        body.evaluator_scores = currentRun.evaluatorScores;
      } else {
        throw new Error('No eval results or AESOP findings available');
      }

      return http.post<GeneratedImprovement>(
        `/internal/evals/skills/${encodeURIComponent(skillId)}/generate-improvement`,
        { body: JSON.stringify(body), version: '1' }
      );
    },
    onSuccess: (data) => {
      setGeneratedImprovement(data);
    },
    onError: (err) => {
      showErrorToast(
        i18n.translate('xpack.agentBuilder.skills.eval.generateImprovementErrorTitle', {
          defaultMessage: 'Failed to generate improvement',
        }),
        err
      );
    },
  });

  const handleApplyImprovement = useCallback(() => {
    if (!generatedImprovement || !onApplyImprovement) return;
    onApplyImprovement({
      name: generatedImprovement.improved_name,
      description: generatedImprovement.improved_description,
      content: generatedImprovement.improved_content,
    });
    setGeneratedImprovement(null);
  }, [generatedImprovement, onApplyImprovement]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* AESOP findings panel — concise when diff is visible, detailed otherwise */}
      {aesopSuggestion && (
        <>
          <EuiPanel
            color="warning"
            paddingSize="s"
            hasShadow={false}
            data-test-subj="agentBuilderSkillAesopFindings"
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="sparkles" size="s" color="warning" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.agentBuilder.skills.eval.aesopFindingsTitle', {
                      defaultMessage: 'AESOP Findings',
                    })}
                  </strong>
                  {' — '}
                  {i18n.translate('xpack.agentBuilder.skills.eval.aesopFindingsSubtitle', {
                    defaultMessage: 'Confidence: {confidence}%',
                    values: { confidence: (aesopSuggestion.confidence * 100).toFixed(0) },
                  })}
                  {aesopSuggestion.validationScore != null && (
                    <>
                      {' · '}
                      {i18n.translate('xpack.agentBuilder.skills.eval.aesopValidationScore', {
                        defaultMessage: 'Validation: {score}%',
                        values: { score: (aesopSuggestion.validationScore * 100).toFixed(0) },
                      })}
                    </>
                  )}
                  {aesopHasContent && (
                    <>
                      {' · '}
                      {i18n.translate('xpack.agentBuilder.skills.eval.aesopHasImprovement', {
                        defaultMessage: 'Improvement ready — see diff below',
                      })}
                    </>
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            {/* Show detail only when diff is NOT auto-shown (avoids duplication) */}
            {!aesopHasContent && (
              <>
                {aesopSuggestion.weaknesses.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.agentBuilder.skills.eval.aesopWeaknesses', {
                          defaultMessage: 'Weaknesses:',
                        })}
                      </strong>
                    </EuiText>
                    <EuiListGroup flush gutterSize="none" maxWidth={false}>
                      {aesopSuggestion.weaknesses.map((w, idx) => (
                        <EuiListGroupItem
                          key={idx}
                          size="xs"
                          iconType="minusInCircle"
                          label={w}
                          wrapText
                        />
                      ))}
                    </EuiListGroup>
                  </>
                )}

                {aesopSuggestion.suggestions.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.agentBuilder.skills.eval.aesopSuggestions', {
                          defaultMessage: 'Suggestions:',
                        })}
                      </strong>
                    </EuiText>
                    <EuiListGroup flush gutterSize="none" maxWidth={false}>
                      {aesopSuggestion.suggestions.map((s, idx) => (
                        <EuiListGroupItem key={idx} size="xs" iconType="check" label={s} wrapText />
                      ))}
                    </EuiListGroup>
                  </>
                )}

                {/* Action buttons — only when no auto-populated diff */}
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  {onApplyImprovement && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        fill
                        iconType="sparkles"
                        onClick={() => generateImprovementMutation.mutate({ fromAesop: true })}
                        isLoading={generateImprovementMutation.isLoading}
                        disabled={!selectedConnectorId}
                        data-test-subj="agentBuilderSkillAesopGenerateImprovement"
                      >
                        {i18n.translate('xpack.agentBuilder.skills.eval.aesopGenerateImprovement', {
                          defaultMessage: 'Generate Improvement',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  {onOpenChat && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        iconType="discuss"
                        onClick={() => onOpenChat()}
                        data-test-subj="agentBuilderSkillAesopDiscuss"
                      >
                        {i18n.translate('xpack.agentBuilder.skills.eval.aesopDiscuss', {
                          defaultMessage: 'Discuss with AI',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}

      {/* LLM Connector picker */}
      <EuiFormRow
        label={i18n.translate('xpack.agentBuilder.skills.eval.connectorLabel', {
          defaultMessage: 'LLM Connector',
        })}
        fullWidth
      >
        <EuiSuperSelect
          options={connectorOptions}
          valueOfSelected={selectedConnectorId}
          onChange={setSelectedConnectorId}
          fullWidth
          data-test-subj="agentBuilderSkillEvalConnectorSelect"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* Dataset picker */}
      <EuiFormRow
        label={i18n.translate('xpack.agentBuilder.skills.eval.datasetLabel', {
          defaultMessage: 'Dataset',
        })}
        fullWidth
      >
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem>
            <EuiSuperSelect
              options={datasetOptions}
              valueOfSelected={selectedDatasetId}
              onChange={(val) => {
                setSelectedDatasetId(val);
                setShowPreview(false);
              }}
              fullWidth
              placeholder={i18n.translate('xpack.agentBuilder.skills.eval.datasetPlaceholder', {
                defaultMessage: 'Select a dataset',
              })}
              data-test-subj="agentBuilderSkillEvalDatasetSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="eye"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!selectedDatasetId}
              data-test-subj="agentBuilderSkillEvalPreviewButton"
            >
              {i18n.translate('xpack.agentBuilder.skills.eval.preview', {
                defaultMessage: 'Preview',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="database"
              onClick={() => generateDatasetMutation.mutate()}
              isLoading={generateDatasetMutation.isLoading}
              disabled={!selectedConnectorId}
              data-test-subj="agentBuilderSkillGenerateDatasetButton"
            >
              {datasetStatus?.exists
                ? i18n.translate('xpack.agentBuilder.skills.eval.regenerateDataset', {
                    defaultMessage: 'Regenerate',
                  })
                : i18n.translate('xpack.agentBuilder.skills.eval.generateDataset', {
                    defaultMessage: 'Generate',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      {generateDatasetMutation.isError && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.agentBuilder.skills.eval.generateDatasetErrorTitle', {
              defaultMessage: 'Failed to generate evaluation dataset',
            })}
            data-test-subj="agentBuilderSkillGenerateDatasetError"
          >
            <p>{getErrorMessage(generateDatasetMutation.error)}</p>
          </EuiCallOut>
        </>
      )}

      {/* Dataset preview accordion */}
      {showPreview && selectedDatasetId && (
        <>
          <EuiSpacer size="s" />
          {previewLoading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiLoadingSpinner size="m" />
            </EuiFlexGroup>
          ) : datasetPreview?.examples?.length ? (
            <div css={previewTableStyles}>
              <EuiBasicTable
                items={datasetPreview.examples}
                columns={previewColumns}
                compressed
                data-test-subj="agentBuilderSkillEvalPreviewTable"
              />
            </div>
          ) : (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agentBuilder.skills.eval.noPreviewData', {
                defaultMessage: 'No examples in this dataset.',
              })}
            </EuiText>
          )}
        </>
      )}

      <EuiSpacer size="m" />

      {/* Evaluator selection — on-demand */}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>
              {evaluators.length > 0
                ? i18n.translate('xpack.agentBuilder.skills.eval.evaluatorsLabel', {
                    defaultMessage: 'Evaluators ({selected}/{total}):',
                    values: {
                      selected: selectedEvaluatorNames.length,
                      total: evaluators.length,
                    },
                  })
                : i18n.translate('xpack.agentBuilder.skills.eval.evaluatorsEmptyLabel', {
                    defaultMessage: 'Evaluators:',
                  })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="list"
                onClick={() => setIsCatalogPopoverOpen((prev) => !prev)}
                data-test-subj="agentBuilderSkillPickEvaluatorsButton"
              >
                {i18n.translate('xpack.agentBuilder.skills.eval.pickEvaluators', {
                  defaultMessage: 'Pick from catalog',
                })}
              </EuiButtonEmpty>
            }
            isOpen={isCatalogPopoverOpen}
            closePopover={() => setIsCatalogPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiSelectable
              aria-label={i18n.translate(
                'xpack.agentBuilder.skills.eval.catalogPopoverAriaLabel',
                { defaultMessage: 'Select evaluators from catalog' }
              )}
              options={catalogOptions}
              onChange={handleCatalogSelectionChange}
              searchable
              searchProps={{
                placeholder: i18n.translate(
                  'xpack.agentBuilder.skills.eval.catalogSearchPlaceholder',
                  { defaultMessage: 'Search evaluators' }
                ),
                compressed: true,
                'data-test-subj': 'agentBuilderSkillEvalCatalogSearch',
              }}
              isLoading={catalogLoading}
              listProps={{ rowHeight: 40, showIcons: false }}
              singleSelection={false}
              height={320}
              emptyMessage={i18n.translate('xpack.agentBuilder.skills.eval.catalogEmpty', {
                defaultMessage: 'No evaluators registered.',
              })}
              data-test-subj="agentBuilderSkillEvalCatalogSelectable"
            >
              {(list, search) => (
                <div css={catalogPopoverStyles}>
                  {search}
                  {list}
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="sparkles"
            onClick={fetchProposedEvaluators}
            isLoading={evaluatorsLoading}
            disabled={!selectedConnectorId}
            data-test-subj="agentBuilderSkillSuggestEvaluatorsButton"
          >
            {i18n.translate('xpack.agentBuilder.skills.eval.suggestEvaluators', {
              defaultMessage: 'Suggest evaluators',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {evaluators.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <div css={evaluatorListStyles}>
            {evaluators.map((evaluator) => (
              <EuiFlexGroup
                key={evaluator.name}
                alignItems="center"
                gutterSize="s"
                responsive={false}
                css={css`
                  padding: 4px 0;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label=""
                    checked={evaluator.selected}
                    onChange={() => toggleEvaluator(evaluator.name)}
                    compressed
                    showLabel={false}
                    data-test-subj={`agentBuilderSkillEval-${evaluator.name}-toggle`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={KIND_BADGE_COLORS[evaluator.kind] ?? 'hollow'}>
                    {evaluator.kind}
                  </EuiBadge>
                </EuiFlexItem>
                {evaluator.source === 'auto-generated' && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={SOURCE_BADGE_COLORS[evaluator.source]}>
                      {i18n.translate('xpack.agentBuilder.skills.eval.customBadge', {
                        defaultMessage: 'Custom',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiToolTip content={evaluator.rationale} position="top">
                    <EuiText size="xs">
                      <strong>{evaluator.name}</strong>
                      {evaluator.description ? ` — ${evaluator.description}` : ''}
                    </EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </div>
        </>
      )}

      <EuiSpacer size="m" />

      {/* Dropped evaluators warning */}
      {droppedEvaluators.length > 0 && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.agentBuilder.skills.eval.droppedEvaluatorsWarning', {
              defaultMessage:
                '{count, plural, one {Evaluator} other {Evaluators}} skipped (not in registry): {names}',
              values: {
                count: droppedEvaluators.length,
                names: droppedEvaluators.join(', '),
              },
            })}
            data-test-subj="agentBuilderSkillEvalDroppedWarning"
          />
          <EuiSpacer size="s" />
        </>
      )}

      {/* No connector warning */}
      {!selectedConnectorId && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.agentBuilder.skills.eval.noConnectorWarning', {
              defaultMessage: 'Select an LLM connector to enable evaluation.',
            })}
            data-test-subj="agentBuilderSkillEvalNoConnector"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {/* Progress bar */}
      {isRunning && currentRun && (
        <>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.skills.eval.running', {
              defaultMessage: 'Running evaluation: {completed}/{total} examples',
              values: {
                completed: currentRun.progress.completed,
                total: currentRun.progress.total || '?',
              },
            })}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiProgress
            value={currentRun.progress.completed}
            max={currentRun.progress.total || 100}
            size="m"
            color="primary"
            data-test-subj="agentBuilderSkillEvalProgress"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {/* Failure callout */}
      {isFailed && currentRun && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            title={i18n.translate('xpack.agentBuilder.skills.eval.failedCallout', {
              defaultMessage: 'Evaluation failed',
            })}
          >
            <EuiText size="xs">{currentRun.error}</EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Inline results */}
      {isCompleted && currentRun?.summary && (
        <>
          <EuiCallOut
            size="s"
            color="success"
            title={i18n.translate('xpack.agentBuilder.skills.eval.completedCallout', {
              defaultMessage: 'Evaluation complete',
            })}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="l" responsive={false}>
            <EuiFlexItem>
              <EuiStat
                title={currentRun.summary.meanScore.toFixed(2)}
                description={i18n.translate('xpack.agentBuilder.skills.eval.meanScore', {
                  defaultMessage: 'Mean Score',
                })}
                titleSize="s"
                data-test-subj="agentBuilderSkillEvalMeanScore"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${(currentRun.summary.passRate * 100).toFixed(0)}%`}
                description={i18n.translate('xpack.agentBuilder.skills.eval.passRate', {
                  defaultMessage: 'Pass Rate',
                })}
                titleSize="s"
                data-test-subj="agentBuilderSkillEvalPassRate"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={String(currentRun.summary.examplesRan)}
                description={i18n.translate('xpack.agentBuilder.skills.eval.examplesRan', {
                  defaultMessage: 'Examples',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${(currentRun.summary.durationMs / 1000).toFixed(1)}s`}
                description={i18n.translate('xpack.agentBuilder.skills.eval.duration', {
                  defaultMessage: 'Duration',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {currentRun.evaluatorScores && currentRun.evaluatorScores.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiAccordion
                id="evalResultsBreakdown"
                buttonContent={i18n.translate('xpack.agentBuilder.skills.eval.evaluatorBreakdown', {
                  defaultMessage: 'Per-evaluator breakdown',
                })}
                paddingSize="s"
              >
                <EuiBasicTable
                  items={currentRun.evaluatorScores}
                  columns={evaluatorResultColumns}
                  compressed
                  data-test-subj="agentBuilderSkillEvalResultsTable"
                />
              </EuiAccordion>
            </>
          )}
          <EuiSpacer size="s" />

          {/* Improvement suggestions (auto-generated after eval) */}
          {suggestImprovementsMutation.isLoading && (
            <>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.agentBuilder.skills.eval.analyzingResults', {
                      defaultMessage: 'Analyzing evaluation results…',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}

          {improvementSuggestions && (
            <>
              <EuiPanel
                color="subdued"
                paddingSize="s"
                hasShadow={false}
                data-test-subj="agentBuilderSkillEvalSuggestions"
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="sparkles" size="s" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.agentBuilder.skills.eval.suggestionsTitle', {
                          defaultMessage: 'AI Analysis',
                        })}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText size="xs">{improvementSuggestions.analysis}</EuiText>

                {improvementSuggestions.weaknesses.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.agentBuilder.skills.eval.weaknessesLabel', {
                          defaultMessage: 'Weaknesses:',
                        })}
                      </strong>
                    </EuiText>
                    <EuiListGroup flush gutterSize="none" maxWidth={false}>
                      {improvementSuggestions.weaknesses.map((w, idx) => (
                        <EuiListGroupItem
                          key={idx}
                          size="xs"
                          iconType="minusInCircle"
                          label={w}
                          wrapText
                        />
                      ))}
                    </EuiListGroup>
                  </>
                )}

                {improvementSuggestions.suggestions.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.agentBuilder.skills.eval.suggestionsLabel', {
                          defaultMessage: 'Suggested improvements:',
                        })}
                      </strong>
                    </EuiText>
                    <EuiListGroup flush gutterSize="none" maxWidth={false}>
                      {improvementSuggestions.suggestions.map((s, idx) => (
                        <EuiListGroupItem key={idx} size="xs" iconType="check" label={s} wrapText />
                      ))}
                    </EuiListGroup>
                  </>
                )}

                {improvementSuggestions.focus_areas.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>
                            {i18n.translate('xpack.agentBuilder.skills.eval.focusAreasLabel', {
                              defaultMessage: 'Focus:',
                            })}
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      {improvementSuggestions.focus_areas.map((area) => (
                        <EuiFlexItem key={area} grow={false}>
                          <EuiBadge color="warning">{area}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </>
                )}
              </EuiPanel>
              <EuiSpacer size="s" />
            </>
          )}

          {suggestImprovementsMutation.isError && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                title={i18n.translate('xpack.agentBuilder.skills.eval.suggestionsError', {
                  defaultMessage: 'Could not generate improvement suggestions',
                })}
              />
              <EuiSpacer size="s" />
            </>
          )}

          <EuiSpacer size="m" />
        </>
      )}

      {/* Generated improvement — side-by-side diff (shown for AESOP or eval-based) */}
      {generatedImprovement && (
        <>
          <EuiPanel
            color="subdued"
            paddingSize="m"
            hasShadow={false}
            data-test-subj="agentBuilderSkillEvalImprovementPreview"
          >
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.agentBuilder.skills.eval.improvementPreviewTitle', {
                  defaultMessage: 'Suggested Improvement',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />

            {/* Changes summary */}
            <EuiCallOut
              size="s"
              color="primary"
              iconType="iInCircle"
              title={i18n.translate('xpack.agentBuilder.skills.eval.changesSummaryTitle', {
                defaultMessage: 'Changes',
              })}
            >
              <EuiText size="xs">{generatedImprovement.changes_summary}</EuiText>
              {generatedImprovement.suggestions.length > 0 && (
                <>
                  <EuiSpacer size="xs" />
                  <ul>
                    {generatedImprovement.suggestions.map((s, idx) => (
                      <li key={idx}>
                        <EuiText size="xs">{s}</EuiText>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </EuiCallOut>

            <EuiSpacer size="s" />

            {/* Action buttons */}
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  iconType="expand"
                  onClick={() => setIsDiffFlyoutOpen(true)}
                  data-test-subj="agentBuilderSkillViewDiffButton"
                >
                  {i18n.translate('xpack.agentBuilder.skills.eval.viewFullDiff', {
                    defaultMessage: 'Review Changes',
                  })}
                </EuiButton>
              </EuiFlexItem>
              {onApplyImprovement && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="check"
                    onClick={handleApplyImprovement}
                    data-test-subj="agentBuilderSkillApplyImprovementButton"
                  >
                    {isReadonly
                      ? i18n.translate('xpack.agentBuilder.skills.eval.createFromImprovement', {
                          defaultMessage: 'Create New Skill',
                        })
                      : i18n.translate('xpack.agentBuilder.skills.eval.applyChanges', {
                          defaultMessage: 'Apply Changes',
                        })}
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={() => setGeneratedImprovement(null)}
                  data-test-subj="agentBuilderSkillDismissImprovementButton"
                >
                  {i18n.translate('xpack.agentBuilder.skills.eval.dismiss', {
                    defaultMessage: 'Dismiss',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />

          {/* Fullscreen diff flyout */}
          <SkillImprovementDiffFlyout
            isOpen={isDiffFlyoutOpen}
            onClose={() => setIsDiffFlyoutOpen(false)}
            currentContent={skillContent}
            improvement={generatedImprovement}
            isReadonly={isReadonly}
            onApply={handleApplyImprovement}
          />
        </>
      )}

      {/* Generate improvement / Improve with AI buttons — show after eval completes and no improvement displayed */}
      {isCompleted && !generatedImprovement && (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {onApplyImprovement && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                iconType="sparkles"
                onClick={() => generateImprovementMutation.mutate({})}
                isLoading={generateImprovementMutation.isLoading}
                disabled={!selectedConnectorId}
                data-test-subj="agentBuilderSkillGenerateImprovementButton"
              >
                {i18n.translate('xpack.agentBuilder.skills.eval.generateImprovement', {
                  defaultMessage: 'Generate Improvement',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          {onOpenChat && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="discuss"
                onClick={handleImproveWithChat}
                data-test-subj="agentBuilderSkillImproveWithChatButton"
              >
                {i18n.translate('xpack.agentBuilder.skills.eval.improveWithChat', {
                  defaultMessage: 'Discuss with AI',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}

      {/* Run eval button */}
      <EuiButton
        size="s"
        fill
        iconType="play"
        onClick={() => {
          setDroppedEvaluators([]);
          runEvalMutation.mutate();
        }}
        isLoading={runEvalMutation.isLoading || isRunning}
        disabled={!selectedConnectorId || !selectedDatasetId || selectedEvaluatorNames.length === 0}
        data-test-subj="agentBuilderSkillRunEvalButton"
      >
        {i18n.translate('xpack.agentBuilder.skills.eval.runEval', {
          defaultMessage: 'Run Evaluation ({count} evaluators)',
          values: { count: selectedEvaluatorNames.length },
        })}
      </EuiButton>
    </>
  );
};
