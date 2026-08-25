/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useIsContextEngineEnabled } from '../../../../hooks/use_is_context_engine_enabled';
import { labels } from '../../../../utils/i18n';
import { AiIndicesFields, useAiIndices } from '../../ai_indices/ai_indices_fields';
import type { AgentFormData } from '../agent_form';

interface AiIndicesSectionProps {
  control: Control<AgentFormData>;
  /** Undefined while creating an agent, when there is no persisted agent to inherit from yet. */
  agentId?: string;
  isFormDisabled: boolean;
}

/**
 * Picks the AI indices, as a section of the agent form's settings tab.
 */
export const AiIndicesSection: React.FC<AiIndicesSectionProps> = ({
  control,
  agentId,
  isFormDisabled,
}) => {
  const isContextEngineEnabled = useIsContextEngineEnabled();

  if (!isContextEngineEnabled) {
    return null;
  }

  return <AiIndicesSectionContent {...{ control, agentId, isFormDisabled }} />;
};

const AiIndicesSectionContent: React.FC<AiIndicesSectionProps> = ({
  control,
  agentId,
  isFormDisabled,
}) => {
  const { availableAiIndices, inheritedIds, warnings, isLoading, error } = useAiIndices(agentId);

  return (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="ai-indices-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="sortRight" aria-hidden={true} />
              <EuiTitle size="xs">
                <h2 id="ai-indices-section-title">{labels.aiIndices.sectionTitle}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              <p>{labels.aiIndices.sectionDescription}</p>
              <p>{labels.aiIndices.notAffectedByElasticCapabilities}</p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={{ minWidth: 0 }}>
          <Controller
            name="configuration.ai_indices"
            control={control}
            render={({ field }) => (
              <AiIndicesFields
                aiIndices={availableAiIndices}
                assignedIds={field.value ?? []}
                inheritedIds={inheritedIds}
                warnings={warnings}
                isLoading={isLoading}
                error={error}
                isFormDisabled={isFormDisabled}
                onChange={field.onChange}
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
