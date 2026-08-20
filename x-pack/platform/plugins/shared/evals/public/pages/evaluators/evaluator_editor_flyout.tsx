/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckboxGroup,
  EuiComboBox,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  type EuiComboBoxOptionOption,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  UserDefinedEvaluatorDraft,
  type JudgeEvidence,
  type JudgeScore,
  type LlmJudgeConfig,
  type TestEvaluatorResponse,
} from '@kbn/evals-common';
import {
  useCreateEvaluator,
  useEvaluator,
  useModelConnectors,
  useResolveInstrumentation,
  useTestEvaluator,
  useUpdateEvaluator,
} from '../../hooks/use_evaluators_api';
import { getErrorMessage } from '../../utils/get_error_message';
import * as i18n from './translations';

interface EvaluatorEditorFlyoutProps {
  mode: 'create' | 'edit';
  evaluatorName?: string;
  onClose: () => void;
}

interface ScoreFormValue {
  id: number;
  name: string;
  type: 'number' | 'categorical';
  description: string;
  labels: string;
}

const EMPTY_SCORE: ScoreFormValue = {
  id: 0,
  name: '',
  type: 'number',
  description: '',
  labels: '',
};

const TRACE_ID_PATTERN = /^[0-9a-fA-F]{32}$/;
const EVIDENCE_PROFILE_KEYS = {
  input: 'user_query',
  response: 'agent_response',
  steps: 'tool_calls',
} as const;

const toScoreFormValue = (score: JudgeScore, id: number): ScoreFormValue => ({
  id,
  name: score.name,
  type: score.type,
  description: score.description ?? '',
  labels: (score.labels ?? [])
    .map(({ value, score: labelScore }) => `${value}=${labelScore}`)
    .join('\n'),
});

const parseLabels = (value: string): JudgeScore['labels'] | undefined => {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return undefined;
  }

  const labels: NonNullable<JudgeScore['labels']> = [];
  for (const line of lines) {
    const separator = line.lastIndexOf('=');
    const label = line.slice(0, separator).trim();
    const score = Number(line.slice(separator + 1).trim());
    if (separator < 1 || !label || !Number.isFinite(score) || score < 0 || score > 1) {
      return undefined;
    }
    labels.push({ value: label, score });
  }
  return labels;
};

const resultValue = (score: NonNullable<TestEvaluatorResponse['result']['scores']>[number]) =>
  score.label ?? (score.score === null || score.score === undefined ? '' : String(score.score));

export const EvaluatorEditorFlyout: React.FC<EvaluatorEditorFlyoutProps> = ({
  mode,
  evaluatorName,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { data: evaluatorData, isLoading: isLoadingEvaluator } = useEvaluator(
    mode === 'edit' ? evaluatorName : undefined
  );
  const { data: connectors = [], isLoading: isLoadingConnectors } = useModelConnectors();
  const createEvaluator = useCreateEvaluator();
  const updateEvaluator = useUpdateEvaluator();
  const testEvaluator = useTestEvaluator();
  const resolveInstrumentation = useResolveInstrumentation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [prompt, setPrompt] = useState('');
  const [evidence, setEvidence] = useState<JudgeEvidence>(['response']);
  const [referenceDataKeys, setReferenceDataKeys] = useState('');
  const [scores, setScores] = useState<ScoreFormValue[]>([{ ...EMPTY_SCORE }]);
  const [nextScoreId, setNextScoreId] = useState(1);
  const [connectorId, setConnectorId] = useState('');
  const [traceId, setTraceId] = useState('');
  const [referenceData, setReferenceData] = useState('{}');
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestEvaluatorResponse['result'] | null>(null);

  useEffect(() => {
    setFormError(null);
    setTestResult(null);
  }, [
    connectorId,
    description,
    evidence,
    name,
    prompt,
    referenceData,
    referenceDataKeys,
    scores,
    systemPrompt,
    traceId,
  ]);

  useEffect(() => {
    const evaluator = evaluatorData?.evaluator;
    if (mode !== 'edit' || !evaluator?.judge) {
      return;
    }

    setName(evaluator.name);
    setDescription(evaluator.description);
    setSystemPrompt(evaluator.judge.system_prompt);
    setPrompt(evaluator.judge.prompt);
    setEvidence(evaluator.judge.evidence);
    setReferenceDataKeys((evaluator.judge.reference_data_keys ?? []).join(', '));
    setScores(evaluator.judge.output.scores.map(toScoreFormValue));
    setNextScoreId(evaluator.judge.output.scores.length);
  }, [evaluatorData, mode]);

  const connectorOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => connectors.map((connector) => ({ label: connector.name, value: connector.id })),
    [connectors]
  );
  const selectedConnector = connectorOptions.filter(({ value }) => value === connectorId);
  const evidenceMap = Object.fromEntries(
    ['input', 'response', 'steps'].map((key) => [
      key,
      evidence.includes(key as JudgeEvidence[number]),
    ])
  );

  const updateScore = (id: number, updates: Partial<ScoreFormValue>) => {
    setScores((current) =>
      current.map((score) => (score.id === id ? { ...score, ...updates } : score))
    );
  };

  const buildDraft = (): LlmJudgeConfig | undefined => {
    const parsedScores: JudgeScore[] = [];
    for (const score of scores) {
      const scoreName = score.name.trim();
      if (!scoreName) {
        return undefined;
      }

      if (score.type === 'categorical') {
        const labels = parseLabels(score.labels);
        if (!labels) {
          setFormError(i18n.INVALID_LABELS_ERROR);
          return undefined;
        }
        parsedScores.push({
          name: scoreName,
          type: score.type,
          labels,
          ...(score.description.trim() ? { description: score.description.trim() } : {}),
        });
        continue;
      }

      parsedScores.push({
        name: scoreName,
        type: score.type,
        ...(score.description.trim() ? { description: score.description.trim() } : {}),
      });
    }

    const judge: LlmJudgeConfig = {
      system_prompt: systemPrompt.trim(),
      prompt: prompt.trim(),
      evidence,
      reference_data_keys: referenceDataKeys
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
      output: { scores: parsedScores },
    };
    const draft = { name: name.trim(), description: description.trim(), judge };
    if (!UserDefinedEvaluatorDraft.safeParse(draft).success) {
      setFormError(i18n.REQUIRED_FIELDS_ERROR);
      return undefined;
    }
    return judge;
  };

  const onSave = async () => {
    setFormError(null);
    const judge = buildDraft();
    if (!judge) {
      return;
    }

    try {
      if (mode === 'create') {
        await createEvaluator.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          judge,
        });
      } else if (evaluatorName) {
        await updateEvaluator.mutateAsync({
          name: evaluatorName,
          updates: { description: description.trim(), judge },
        });
      }
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const onTest = async () => {
    setFormError(null);
    setTestResult(null);
    const judge = buildDraft();
    if (!judge) {
      return;
    }
    if (!connectorId || !TRACE_ID_PATTERN.test(traceId.trim())) {
      setFormError(i18n.TEST_FIELDS_ERROR);
      return;
    }

    let parsedReferenceData: Record<string, unknown>;
    try {
      const parsed = JSON.parse(referenceData) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error();
      }
      parsedReferenceData = parsed as Record<string, unknown>;
    } catch {
      setFormError(i18n.INVALID_REFERENCE_DATA_ERROR);
      return;
    }

    try {
      const instrumentation = await resolveInstrumentation.mutateAsync(traceId.trim());
      const resolvedProfile =
        instrumentation.recommended_instrumentation?.profile ??
        instrumentation.profiles.find((profile) =>
          evidence.every((key) => profile.evidence[EVIDENCE_PROFILE_KEYS[key]].status === 'found')
        )?.profile;
      if (!resolvedProfile) {
        setFormError(i18n.NO_INSTRUMENTATION_ERROR);
        return;
      }
      const response = await testEvaluator.mutateAsync({
        definition: { name: name.trim(), description: description.trim(), judge },
        connector_id: connectorId,
        subject: {
          traces: [{ trace_id: traceId.trim(), reference_data: parsedReferenceData }],
          instrumentation: { profile: resolvedProfile },
        },
      });
      setTestResult(response.result);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const isSaving = createEvaluator.isLoading || updateEvaluator.isLoading;
  const isTesting = testEvaluator.isLoading || resolveInstrumentation.isLoading;

  return (
    <EuiFlyout ownFocus onClose={onClose} size="l" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {mode === 'create' ? i18n.CREATE_FLYOUT_TITLE : i18n.EDIT_FLYOUT_TITLE}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {mode === 'edit' && isLoadingEvaluator ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <EuiForm isInvalid={Boolean(formError)} error={formError ?? undefined} component="form">
            <EuiFormRow label={i18n.NAME_LABEL} helpText={i18n.NAME_HELP} fullWidth>
              <EuiFieldText
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={mode === 'edit'}
                maxLength={128}
                fullWidth
                data-test-subj="evalsEvaluatorName"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.DESCRIPTION_LABEL} fullWidth>
              <EuiTextArea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2048}
                fullWidth
                data-test-subj="evalsEvaluatorDescription"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.SYSTEM_PROMPT_LABEL} fullWidth>
              <EuiTextArea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                fullWidth
                data-test-subj="evalsEvaluatorSystemPrompt"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.PROMPT_LABEL} helpText={i18n.PROMPT_HELP} fullWidth>
              <EuiTextArea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                fullWidth
                data-test-subj="evalsEvaluatorPrompt"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.EVIDENCE_LABEL} labelType="legend" fullWidth>
              <EuiCheckboxGroup
                options={[
                  { id: 'input', label: i18n.INPUT_EVIDENCE },
                  { id: 'response', label: i18n.RESPONSE_EVIDENCE },
                  { id: 'steps', label: i18n.STEPS_EVIDENCE },
                ]}
                idToSelectedMap={evidenceMap}
                onChange={(id) =>
                  setEvidence((current) =>
                    current.includes(id as JudgeEvidence[number])
                      ? current.filter((key) => key !== id)
                      : [...current, id as JudgeEvidence[number]]
                  )
                }
                data-test-subj="evalsEvaluatorEvidence"
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.REFERENCE_DATA_LABEL}
              helpText={i18n.REFERENCE_DATA_HELP}
              fullWidth
            >
              <EuiFieldText
                value={referenceDataKeys}
                onChange={(event) => setReferenceDataKeys(event.target.value)}
                fullWidth
                data-test-subj="evalsEvaluatorReferenceKeys"
              />
            </EuiFormRow>

            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>{i18n.SCORES_TITLE}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  onClick={() => {
                    setScores((current) => [...current, { ...EMPTY_SCORE, id: nextScoreId }]);
                    setNextScoreId((current) => current + 1);
                  }}
                  data-test-subj="evalsEvaluatorAddScore"
                >
                  {i18n.ADD_SCORE_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {scores.map((score) => (
              <React.Fragment key={score.id}>
                <EuiPanel hasBorder hasShadow={false} paddingSize="m">
                  <EuiFlexGroup alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiFormRow label={i18n.SCORE_NAME_LABEL} fullWidth>
                        <EuiFieldText
                          value={score.name}
                          onChange={(event) => updateScore(score.id, { name: event.target.value })}
                          fullWidth
                          data-test-subj={`evalsEvaluatorScoreName-${score.id}`}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow label={i18n.SCORE_TYPE_LABEL} fullWidth>
                        <EuiSelect
                          value={score.type}
                          onChange={(event) =>
                            updateScore(score.id, {
                              type: event.target.value as ScoreFormValue['type'],
                            })
                          }
                          options={[
                            { value: 'number', text: i18n.NUMERIC_SCORE },
                            { value: 'categorical', text: i18n.CATEGORICAL_SCORE },
                          ]}
                          fullWidth
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="l" />
                      <EuiToolTip content={i18n.REMOVE_SCORE_ARIA_LABEL} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="trash"
                          color="danger"
                          aria-label={i18n.REMOVE_SCORE_ARIA_LABEL}
                          disabled={scores.length === 1}
                          onClick={() =>
                            setScores((current) => current.filter(({ id }) => id !== score.id))
                          }
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFormRow label={i18n.SCORE_DESCRIPTION_LABEL} fullWidth>
                    <EuiTextArea
                      value={score.description}
                      onChange={(event) =>
                        updateScore(score.id, { description: event.target.value })
                      }
                      fullWidth
                    />
                  </EuiFormRow>
                  {score.type === 'categorical' && (
                    <EuiFormRow label={i18n.LABELS_LABEL} helpText={i18n.LABELS_HELP} fullWidth>
                      <EuiTextArea
                        value={score.labels}
                        onChange={(event) => updateScore(score.id, { labels: event.target.value })}
                        fullWidth
                      />
                    </EuiFormRow>
                  )}
                </EuiPanel>
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}

            <EuiSpacer size="m" />
            <EuiTitle size="s">
              <h3>{i18n.TEST_TITLE}</h3>
            </EuiTitle>
            <EuiText size="s">
              <p>{i18n.TEST_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFormRow label={i18n.CONNECTOR_LABEL} fullWidth>
              <EuiComboBox<string>
                options={connectorOptions}
                selectedOptions={selectedConnector}
                onChange={(selected) => setConnectorId(selected[0]?.value ?? '')}
                singleSelection={{ asPlainText: true }}
                isLoading={isLoadingConnectors}
                fullWidth
                data-test-subj="evalsEvaluatorConnector"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.TRACE_ID_LABEL} fullWidth>
              <EuiFieldText
                value={traceId}
                onChange={(event) => setTraceId(event.target.value)}
                maxLength={32}
                fullWidth
                data-test-subj="evalsEvaluatorTraceId"
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.REFERENCE_DATA_JSON_LABEL}
              helpText={i18n.REFERENCE_DATA_JSON_HELP}
              fullWidth
            >
              <EuiTextArea
                value={referenceData}
                onChange={(event) => setReferenceData(event.target.value)}
                fullWidth
                data-test-subj="evalsEvaluatorReferenceData"
              />
            </EuiFormRow>
            <EuiButton
              onClick={onTest}
              isLoading={isTesting}
              disabled={isSaving}
              data-test-subj="evalsEvaluatorRunTest"
            >
              {i18n.RUN_TEST_BUTTON}
            </EuiButton>
            {testResult && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  title={
                    testResult.status === 'ok' ? i18n.TEST_SUCCEEDED_TITLE : i18n.TEST_FAILED_TITLE
                  }
                  color={testResult.status === 'ok' ? 'success' : 'danger'}
                  iconType={testResult.status === 'ok' ? 'check' : 'warning'}
                  data-test-subj="evalsEvaluatorTestResult"
                >
                  {testResult.error ? <p>{testResult.error.message}</p> : null}
                  {(testResult.scores ?? []).map((score) => (
                    <p key={score.name}>
                      <strong>{i18n.SCORE_RESULT(score.name, resultValue(score))}</strong>
                      {score.explanation ? ` ${i18n.SCORE_EXPLANATION(score.explanation)}` : null}
                    </p>
                  ))}
                </EuiCallOut>
              </>
            )}
          </EuiForm>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSave}
              isLoading={isSaving}
              disabled={isTesting || (mode === 'edit' && isLoadingEvaluator)}
              data-test-subj="evalsEvaluatorSave"
            >
              {i18n.SAVE_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
