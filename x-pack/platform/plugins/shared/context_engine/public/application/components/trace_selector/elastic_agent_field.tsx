/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { AiIndexTrace } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';

interface ElasticAgentFieldProps {
  value: AiIndexTrace | undefined;
  onChange: (trace: AiIndexTrace | undefined) => void;
}

export const ElasticAgentField = ({ value, onChange }: ElasticAgentFieldProps) => {
  const { agents, isLoading, error } = useAgentBuilderAgents();

  const options = useMemo(
    () => agents.map((agent) => ({ label: agent.name, value: agent.id })),
    [agents]
  );

  const selectedOptions = useMemo(() => {
    if (value?.type !== 'elastic_agent') {
      return [];
    }
    const agent = agents.find(({ id }) => id === value.value);
    return [{ label: agent?.name ?? value.value, value: value.value }];
  }, [agents, value]);

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const next = selected[0]?.value;
    onChange(next ? { type: 'elastic_agent', value: next } : undefined);
  };

  const errorMessage = error
    ? i18n.translate('xpack.contextEngine.traceSelector.agentField.loadError', {
        defaultMessage: 'Unable to load Agent Builder agents.',
      })
    : undefined;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.contextEngine.traceSelector.agentField.label', {
        defaultMessage: 'Agent',
      })}
      helpText={i18n.translate('xpack.contextEngine.traceSelector.agentField.helpText', {
        defaultMessage:
          'Agents registered in Agent Builder. Traces are matched on gen_ai.agent.id.',
      })}
      error={errorMessage}
      isInvalid={Boolean(errorMessage)}
      fullWidth
    >
      <EuiComboBox
        isInvalid={Boolean(errorMessage)}
        singleSelection={{ asPlainText: true }}
        fullWidth
        isLoading={isLoading}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        placeholder={i18n.translate('xpack.contextEngine.traceSelector.agentField.placeholder', {
          defaultMessage: 'Select an agent',
        })}
        aria-label={i18n.translate('xpack.contextEngine.traceSelector.agentField.ariaLabel', {
          defaultMessage: 'Agent trace source',
        })}
        data-test-subj="contextTraceAgentComboBox"
      />
    </EuiFormRow>
  );
};
