/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { useIsContextEngineEnabled } from '../../../../hooks/use_is_context_engine_enabled';
import { labels } from '../../../../utils/i18n';
import { AiIndicesFields, useAiIndices } from '../../ai_indices/ai_indices_fields';
import type { EditDetailsFormData } from './types';

interface AiIndicesSectionProps {
  agentId: string;
  isDisabled: boolean;
}

/**
 * Picks the AI indices an agent retrieves from, as a panel of the edit-settings flyout. Shares its
 * controls with the agent form's settings tab; only the chrome around them differs.
 */
export const AiIndicesSection: React.FC<AiIndicesSectionProps> = ({ agentId, isDisabled }) => {
  const isContextEngineEnabled = useIsContextEngineEnabled();

  if (!isContextEngineEnabled) {
    return null;
  }

  return <AiIndicesSectionContent agentId={agentId} isDisabled={isDisabled} />;
};

const AiIndicesSectionContent: React.FC<AiIndicesSectionProps> = ({ agentId, isDisabled }) => {
  const { control } = useFormContext<EditDetailsFormData>();
  const { aiIndices, inheritedIds, isLoading, error } = useAiIndices(agentId);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l" data-test-subj="editDetailsAiIndicesSection">
        <EuiTitle size="xxs">
          <h4>{labels.aiIndices.sectionTitle}</h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {labels.aiIndices.sectionDescription} {labels.aiIndices.notAffectedByElasticCapabilities}
        </EuiText>
        <EuiSpacer size="s" />
        <Controller
          name="configuration.ai_indices"
          control={control}
          render={({ field }) => (
            <AiIndicesFields
              aiIndices={aiIndices}
              assignedIds={field.value ?? []}
              inheritedIds={inheritedIds}
              isLoading={isLoading}
              error={error}
              isFormDisabled={isDisabled}
              onChange={field.onChange}
            />
          )}
        />
      </EuiPanel>
    </>
  );
};
