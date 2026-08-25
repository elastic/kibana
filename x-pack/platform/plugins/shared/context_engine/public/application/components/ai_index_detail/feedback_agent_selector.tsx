/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useUpdateFeedbackAgent } from '../../hooks/use_update_feedback_agent';

interface FeedbackAgentSelectorProps {
  aiIndex: AiIndexHttpItem;
}

const UNSET_VALUE = '';

/** Select control for the AI index's Analyze & improve Agent Builder agent. */
export const FeedbackAgentSelector = ({ aiIndex }: FeedbackAgentSelectorProps) => {
  const { agents, isLoading, error } = useAgentBuilderAgents();
  const updateFeedbackAgent = useUpdateFeedbackAgent(aiIndex);

  const options: EuiSelectOption[] = [
    {
      value: UNSET_VALUE,
      text: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.feedbackAgent.unset', {
        defaultMessage: 'Select an agent…',
      }),
    },
    ...agents.map((agent) => ({ value: agent.id, text: agent.name || agent.id })),
  ];

  const errorMessage = error
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.signals.feedbackAgent.loadError', {
        defaultMessage: 'Unable to load Agent Builder agents.',
      })
    : undefined;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.contextEngine.aiIndexDetail.signals.feedbackAgent.label', {
        defaultMessage: 'Analysis agent',
      })}
      helpText={i18n.translate('xpack.contextEngine.aiIndexDetail.signals.feedbackAgent.help', {
        defaultMessage: 'The Agent Builder agent that runs "Analyze & improve" for this index.',
      })}
      isInvalid={Boolean(errorMessage)}
      error={errorMessage}
    >
      <EuiSelect
        compressed
        isLoading={isLoading || updateFeedbackAgent.isLoading}
        isInvalid={Boolean(errorMessage)}
        options={options}
        value={aiIndex.feedback_analysis?.agent_id ?? UNSET_VALUE}
        onChange={(event) => {
          const value = event.target.value;
          updateFeedbackAgent.mutate(value === UNSET_VALUE ? undefined : value);
        }}
        data-test-subj="contextSignalsFeedbackAgentSelect"
      />
    </EuiFormRow>
  );
};
