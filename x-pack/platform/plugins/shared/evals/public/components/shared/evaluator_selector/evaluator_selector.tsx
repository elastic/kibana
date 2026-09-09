/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiFormRow, EuiText, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListEvaluatorsResponse } from '@kbn/evals-common';
import { ConnectorSelector, type ConnectorSelectorOption } from '../connector_selector';

type EvaluatorDefinition = ListEvaluatorsResponse['evaluators'][number];

export interface SelectedEvaluator {
  name: string;
  version?: string;
  kind: 'llm' | 'code';
  connectorId?: string;
}

interface EvaluatorOptionMeta {
  disabled?: boolean;
  toolTipContent?: string;
  append?: React.ReactNode;
}

interface Props {
  label: string;
  evaluators: EvaluatorDefinition[];
  selectedEvaluators: SelectedEvaluator[];
  connectorOptions: ConnectorSelectorOption[];
  onChange: (evaluators: SelectedEvaluator[]) => void;
  evaluatorsDataTestSubj: string;
  judgeConnectorDataTestSubjPrefix: string;
  isEvaluatorsLoading?: boolean;
  isConnectorsLoading?: boolean;
  showJudgeConnectorSelection?: boolean;
  evaluatorFilter?: (evaluator: EvaluatorDefinition) => boolean;
  evaluatorOptionLabel?: (evaluator: EvaluatorDefinition) => string;
  evaluatorOptionMeta?: (evaluator: EvaluatorDefinition) => EvaluatorOptionMeta;
}

export const EvaluatorSelector = ({
  label,
  evaluators,
  selectedEvaluators,
  connectorOptions,
  onChange,
  evaluatorsDataTestSubj,
  judgeConnectorDataTestSubjPrefix,
  isEvaluatorsLoading = false,
  isConnectorsLoading = false,
  showJudgeConnectorSelection = true,
  evaluatorFilter,
  evaluatorOptionLabel = (evaluator) =>
    evaluator.kind === 'llm' ? `${evaluator.name} (LLM)` : evaluator.name,
  evaluatorOptionMeta,
}: Props) => {
  const availableEvaluators = useMemo(
    () => (evaluatorFilter ? evaluators.filter(evaluatorFilter) : evaluators),
    [evaluatorFilter, evaluators]
  );

  const evaluatorOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      availableEvaluators.map((evaluator) => {
        const meta = evaluatorOptionMeta?.(evaluator);
        return {
          label: evaluatorOptionLabel(evaluator),
          value: evaluator.name,
          ...meta,
        };
      }),
    [availableEvaluators, evaluatorOptionLabel, evaluatorOptionMeta]
  );

  const selectedEvaluatorOptions = useMemo(
    () =>
      evaluatorOptions.filter((option) => selectedEvaluators.some((e) => e.name === option.value)),
    [evaluatorOptions, selectedEvaluators]
  );

  const onSelectEvaluators = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const byName = new Map(selectedEvaluators.map((evaluator) => [evaluator.name, evaluator]));
      const next = selected
        .map((option) => availableEvaluators.find((evaluator) => evaluator.name === option.value))
        .filter((evaluator): evaluator is EvaluatorDefinition => evaluator !== undefined)
        .map<SelectedEvaluator>((evaluator) => ({
          name: evaluator.name,
          version: evaluator.version,
          kind: evaluator.kind,
          connectorId: byName.get(evaluator.name)?.connectorId,
        }));
      onChange(next);
    },
    [availableEvaluators, onChange, selectedEvaluators]
  );

  const setEvaluatorConnector = useCallback(
    (evaluatorName: string, connectorId: string) => {
      onChange(
        selectedEvaluators.map((evaluator) =>
          evaluator.name === evaluatorName
            ? { ...evaluator, connectorId: connectorId || undefined }
            : evaluator
        )
      );
    },
    [onChange, selectedEvaluators]
  );

  return (
    <>
      <EuiFormRow label={label} fullWidth>
        <EuiComboBox<string>
          fullWidth
          isLoading={isEvaluatorsLoading}
          options={evaluatorOptions}
          selectedOptions={selectedEvaluatorOptions}
          onChange={onSelectEvaluators}
          data-test-subj={evaluatorsDataTestSubj}
        />
      </EuiFormRow>

      {showJudgeConnectorSelection &&
        selectedEvaluators
          .filter((evaluator) => evaluator.kind === 'llm')
          .map((evaluator) => (
            <ConnectorSelector
              key={evaluator.name}
              label={i18n.translate('xpack.evals.sharedEvaluatorSelector.judgeConnectorLabel', {
                defaultMessage: '{name} evaluator - judge connector',
                values: { name: evaluator.name },
              })}
              selectedConnectorIds={evaluator.connectorId ? [evaluator.connectorId] : []}
              connectorOptions={connectorOptions}
              onChange={(connectorIds) =>
                setEvaluatorConnector(evaluator.name, connectorIds[0] ?? '')
              }
              isLoading={isConnectorsLoading}
              isInvalid={!evaluator.connectorId}
              dataTestSubj={`${judgeConnectorDataTestSubjPrefix}-${evaluator.name}`}
              singleSelection
              isClearable={false}
            />
          ))}

      {!showJudgeConnectorSelection &&
        selectedEvaluators.some((evaluator) => evaluator.kind === 'llm') && (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.evals.sharedEvaluatorSelector.llmEvaluatorHint', {
              defaultMessage: 'Selected LLM evaluators require a connector.',
            })}
          </EuiText>
        )}
    </>
  );
};
