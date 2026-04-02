/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type {
  LlmJudgeConfig,
  CodeConfig,
  EsqlConfig,
  TestEvaluatorResponse,
} from '../../hooks/use_evaluators_api';
import { useTestEvaluator } from '../../hooks/use_evaluators_api';
import { EvaluatorScoreBadge } from '../../components/evaluator_score_badge';
import * as i18n from './translations';

interface EvaluatorPlaygroundProps {
  evaluatorId?: string;
  config?: LlmJudgeConfig | CodeConfig | EsqlConfig;
}

export const EvaluatorPlayground: React.FC<EvaluatorPlaygroundProps> = ({
  evaluatorId,
  config,
}) => {
  const [sampleInput, setSampleInput] = useState('{\n  "query": "example query"\n}');
  const [sampleOutput, setSampleOutput] = useState('{\n  "response": "example response"\n}');
  const [result, setResult] = useState<TestEvaluatorResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const testEvaluator = useTestEvaluator();

  const onRunTest = async () => {
    setParseError(null);
    setResult(null);

    let parsedInput: Record<string, unknown>;
    let parsedOutput: Record<string, unknown>;

    try {
      parsedInput = JSON.parse(sampleInput);
    } catch {
      setParseError('Invalid JSON in sample input');
      return;
    }

    try {
      parsedOutput = JSON.parse(sampleOutput);
    } catch {
      setParseError('Invalid JSON in sample output');
      return;
    }

    try {
      const response = await testEvaluator.mutateAsync({
        evaluator_name: evaluatorId ?? '',
        input: parsedInput,
        output: parsedOutput,
      });
      setResult(response);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h4>{i18n.PLAYGROUND_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label={i18n.PLAYGROUND_SAMPLE_INPUT} fullWidth>
            <EuiTextArea
              fullWidth
              rows={6}
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.PLAYGROUND_SAMPLE_OUTPUT} fullWidth>
            <EuiTextArea
              fullWidth
              rows={6}
              value={sampleOutput}
              onChange={(e) => setSampleOutput(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiButton
        onClick={onRunTest}
        fill
        isLoading={testEvaluator.isLoading}
        disabled={testEvaluator.isLoading}
        iconType="play"
      >
        {i18n.PLAYGROUND_RUN_TEST}
      </EuiButton>

      {parseError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut color="danger" title={parseError} size="s" />
        </>
      )}

      {result && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasShadow={false} color="subdued">
            <EuiTitle size="xxs">
              <h5>{i18n.PLAYGROUND_RESULT_TITLE}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiFlexGroup gutterSize="l" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{i18n.PLAYGROUND_SCORE}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EvaluatorScoreBadge score={result.result.score} label={result.result.label} />
              </EuiFlexItem>

              {result.result.label && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{i18n.PLAYGROUND_LABEL}</strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">{result.result.label}</EuiText>
                </EuiFlexItem>
              )}

              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{i18n.PLAYGROUND_TIMING}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s">{i18n.getTimingLabel(result.duration_ms)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            {result.result.explanation && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs">
                  <strong>{i18n.PLAYGROUND_EXPLANATION}</strong>
                </EuiText>
                <EuiText size="s">{result.result.explanation}</EuiText>
              </>
            )}
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};
