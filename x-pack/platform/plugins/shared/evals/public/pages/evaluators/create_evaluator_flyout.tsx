/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { LlmJudgeConfig, CodeConfig, EsqlConfig } from '../../hooks/use_evaluators_api';
import { useCreateEvaluator } from '../../hooks/use_evaluators_api';
import { EvaluatorPlayground } from './evaluator_playground';
import * as i18n from './translations';

type EvaluatorType = 'llm-judge' | 'code' | 'esql';
type ScoringMode = 'boolean' | 'continuous' | 'rubric';

interface CreateEvaluatorFlyoutProps {
  onClose: () => void;
}

const VARIABLE_BUTTONS = ['{input}', '{output}', '{reference}'];

const SCORING_MODE_OPTIONS = [
  { id: 'boolean', label: i18n.SCORING_BOOLEAN },
  { id: 'continuous', label: i18n.SCORING_CONTINUOUS },
  { id: 'rubric', label: i18n.SCORING_RUBRIC },
];

export const CreateEvaluatorFlyout: React.FC<CreateEvaluatorFlyoutProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [evaluatorType, setEvaluatorType] = useState<EvaluatorType | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // LLM Judge fields
  const [promptTemplate, setPromptTemplate] = useState('');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('boolean');
  const [connectorId, setConnectorId] = useState('');
  const [feedbackKey, setFeedbackKey] = useState('');

  // Code fields
  const [functionBody, setFunctionBody] = useState(
    '// Available: input, output, expected, metadata\nreturn { score: 1.0 };'
  );

  // ES|QL fields
  const [queryTemplate, setQueryTemplate] = useState('');
  const [scoreExpression, setScoreExpression] = useState('row_count > 0 ? 1.0 : 0.0');
  const [passCondition, setPassCondition] = useState('score >= 0.5');

  const createEvaluator = useCreateEvaluator();

  const insertVariable = (variable: string) => {
    setPromptTemplate((prev) => prev + variable);
  };

  const buildConfig = (): LlmJudgeConfig | CodeConfig | EsqlConfig | null => {
    if (evaluatorType === 'llm-judge') {
      return {
        type: 'llm-judge',
        prompt_template: promptTemplate,
        scoring_mode: scoringMode,
        connector_id: connectorId || undefined,
        feedback_key: feedbackKey || 'score',
      };
    }
    if (evaluatorType === 'code') {
      return {
        type: 'code',
        function_body: functionBody,
      };
    }
    if (evaluatorType === 'esql') {
      return {
        type: 'esql',
        query_template: queryTemplate,
        score_expression: scoreExpression,
        pass_condition: passCondition,
      };
    }
    return null;
  };

  const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

  const onSave = async () => {
    if (!name.trim()) {
      setFormError(i18n.NAME_REQUIRED_ERROR);
      return;
    }
    if (!NAME_PATTERN.test(name.trim())) {
      setFormError(i18n.NAME_FORMAT_ERROR);
      return;
    }
    if (!evaluatorType) return;

    const config = buildConfig();
    if (!config) return;

    try {
      setFormError(null);
      await createEvaluator.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        kind: evaluatorType === 'llm-judge' ? 'LLM' : 'CODE',
        type: evaluatorType,
        config,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const steps = [
    {
      title: i18n.STEP_CHOOSE_TYPE,
      status: (currentStep === 0 ? 'current' : 'complete') as 'current' | 'complete',
      onClick: () => setCurrentStep(0),
    },
    {
      title: i18n.STEP_CONFIGURE,
      status: (currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'incomplete') as
        | 'current'
        | 'complete'
        | 'incomplete',
      onClick: () => evaluatorType && setCurrentStep(1),
      disabled: !evaluatorType,
    },
    {
      title: i18n.STEP_TEST,
      status: (currentStep === 2 ? 'current' : 'incomplete') as 'current' | 'incomplete',
      onClick: () => evaluatorType && setCurrentStep(2),
      disabled: !evaluatorType,
    },
  ];

  const renderTypeSelection = () => (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon type="machineLearningApp" size="xl" />}
          title={i18n.TYPE_CARD_LLM_JUDGE_TITLE}
          description={i18n.TYPE_CARD_LLM_JUDGE_DESCRIPTION}
          selectable={{
            onClick: () => setEvaluatorType('llm-judge'),
            isSelected: evaluatorType === 'llm-judge',
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon type="console" size="xl" />}
          title={i18n.TYPE_CARD_CODE_TITLE}
          description={i18n.TYPE_CARD_CODE_DESCRIPTION}
          selectable={{
            onClick: () => setEvaluatorType('code'),
            isSelected: evaluatorType === 'code',
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon type="database" size="xl" />}
          title={i18n.TYPE_CARD_ESQL_TITLE}
          description={i18n.TYPE_CARD_ESQL_DESCRIPTION}
          selectable={{
            onClick: () => setEvaluatorType('esql'),
            isSelected: evaluatorType === 'esql',
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderLlmJudgeConfig = () => (
    <>
      <EuiFormRow label={i18n.PROMPT_TEMPLATE_LABEL} helpText={i18n.PROMPT_TEMPLATE_HELP} fullWidth>
        <EuiTextArea
          fullWidth
          rows={10}
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        {VARIABLE_BUTTONS.map((variable) => (
          <EuiFlexItem key={variable} grow={false}>
            <EuiButtonEmpty size="xs" onClick={() => insertVariable(variable)}>
              {variable}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.SCORING_MODE_LABEL}>
        <EuiRadioGroup
          options={SCORING_MODE_OPTIONS}
          idSelected={scoringMode}
          onChange={(id) => setScoringMode(id as ScoringMode)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.CONNECTOR_LABEL}>
        <EuiFieldText
          value={connectorId}
          onChange={(e) => setConnectorId(e.target.value)}
          placeholder="connector-id"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.FEEDBACK_KEY_LABEL}>
        <EuiFieldText
          value={feedbackKey}
          onChange={(e) => setFeedbackKey(e.target.value)}
          placeholder="score"
        />
      </EuiFormRow>
    </>
  );

  const renderCodeConfig = () => (
    <>
      <EuiFormRow label={i18n.CODE_BODY_LABEL} fullWidth>
        <EuiTextArea
          fullWidth
          rows={12}
          value={functionBody}
          onChange={(e) => setFunctionBody(e.target.value)}
          css={{ fontFamily: 'monospace' }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiCallOut title={i18n.CODE_VARIABLES_TITLE} color="primary" iconType="iInCircle" size="s">
        <EuiText size="xs">{i18n.CODE_VARIABLES_DESCRIPTION}</EuiText>
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiCallOut title={i18n.CODE_RETURN_TYPE_TITLE} color="primary" iconType="iInCircle" size="s">
        <EuiText size="xs">
          <code>{i18n.CODE_RETURN_TYPE_DESCRIPTION}</code>
        </EuiText>
      </EuiCallOut>
    </>
  );

  const renderEsqlConfig = () => (
    <>
      <EuiFormRow label={i18n.ESQL_QUERY_LABEL} helpText={i18n.ESQL_QUERY_HELP} fullWidth>
        <EuiTextArea
          fullWidth
          rows={6}
          value={queryTemplate}
          onChange={(e) => setQueryTemplate(e.target.value)}
          css={{ fontFamily: 'monospace' }}
          placeholder="FROM logs-* | WHERE @timestamp > NOW() - 1h | STATS count = COUNT(*)"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s">
        {['{input}', '{output}'].map((v) => (
          <EuiFlexItem grow={false} key={v}>
            <EuiButtonEmpty size="xs" onClick={() => setQueryTemplate((prev) => prev + v)}>
              {v}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.ESQL_SCORE_EXPR_LABEL} helpText={i18n.ESQL_SCORE_EXPR_HELP}>
        <EuiFieldText
          value={scoreExpression}
          onChange={(e) => setScoreExpression(e.target.value)}
          css={{ fontFamily: 'monospace' }}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ESQL_PASS_COND_LABEL} helpText={i18n.ESQL_PASS_COND_HELP}>
        <EuiFieldText
          value={passCondition}
          onChange={(e) => setPassCondition(e.target.value)}
          css={{ fontFamily: 'monospace' }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiCallOut title={i18n.ESQL_VARIABLES_TITLE} color="primary" iconType="iInCircle" size="s">
        <EuiText size="xs">{i18n.ESQL_VARIABLES_DESCRIPTION}</EuiText>
      </EuiCallOut>
    </>
  );

  const renderConfigStep = () => (
    <EuiForm component="form">
      <EuiFormRow
        label={i18n.NAME_LABEL}
        isInvalid={Boolean(formError)}
        error={formError ?? undefined}
      >
        <EuiFieldText
          value={name}
          onChange={(e) => setName(e.target.value)}
          isInvalid={Boolean(formError)}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.DESCRIPTION_LABEL}>
        <EuiFieldText value={description} onChange={(e) => setDescription(e.target.value)} />
      </EuiFormRow>
      <EuiSpacer size="l" />
      {evaluatorType === 'llm-judge' && renderLlmJudgeConfig()}
      {evaluatorType === 'code' && renderCodeConfig()}
      {evaluatorType === 'esql' && renderEsqlConfig()}
    </EuiForm>
  );

  const renderTestStep = () => {
    const config = buildConfig();
    return config ? <EvaluatorPlayground config={config} /> : null;
  };

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.CREATE_FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiStepsHorizontal steps={steps} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {currentStep === 0 && renderTypeSelection()}
        {currentStep === 1 && renderConfigStep()}
        {currentStep === 2 && renderTestStep()}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {currentStep > 0 ? (
              <EuiButtonEmpty onClick={() => setCurrentStep(currentStep - 1)}>
                {i18n.BACK_BUTTON}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {currentStep < 2 ? (
              <EuiButton
                onClick={() => setCurrentStep(currentStep + 1)}
                fill
                disabled={currentStep === 0 && !evaluatorType}
              >
                {i18n.NEXT_BUTTON}
              </EuiButton>
            ) : (
              <EuiButton
                onClick={onSave}
                fill
                isLoading={createEvaluator.isLoading}
                disabled={createEvaluator.isLoading}
              >
                {i18n.SAVE_BUTTON}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
