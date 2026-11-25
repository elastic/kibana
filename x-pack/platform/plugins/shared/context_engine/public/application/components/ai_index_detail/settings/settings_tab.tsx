/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { useAiIndexDreaming } from '../../../hooks/use_ai_index_dreaming';
import { useMemoryEnabled } from '../../../hooks/use_memory_enabled';
import { AutomationsSection } from '../automations_section';
import { AdvancedSection } from './advanced_section';
import { DreamingPanel } from './dreaming_panel';
import { GeneralSection } from './general_section';

interface SettingsTabProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  aiIndexId: string;
  onSaved: () => Promise<unknown>;
  isAutomationsUnlocked: boolean;
  indexManagementHref: string | undefined;
}

export const SettingsTab = ({
  isLoading,
  aiIndex,
  aiIndexId,
  onSaved,
  isAutomationsUnlocked,
  indexManagementHref,
}: SettingsTabProps) => {
  const isMemoryEnabled = useMemoryEnabled();
  const { isLoading: isDreamingLoading } = useAiIndexDreaming(aiIndex?.id ?? aiIndexId, {
    enabled: isMemoryEnabled && aiIndex !== undefined,
  });

  return (
    <div data-test-subj="contextAiIndexSettingsTab">
      <GeneralSection isLoading={isLoading} aiIndex={aiIndex} onSaved={onSaved} />
      {isMemoryEnabled && aiIndex && (
        <>
          <EuiSpacer size="xl" />
          <DreamingPanel key={aiIndex.id} aiIndex={aiIndex} />
        </>
      )}
      <EuiSpacer size="xl" />
      <AutomationsSection
        isLoading={isLoading}
        aiIndex={aiIndex}
        aiIndexId={aiIndexId}
        onSaved={onSaved}
        isUnlocked={isAutomationsUnlocked}
        isContentAboveLoading={isDreamingLoading}
      />
      {aiIndex && (
        <>
          <EuiSpacer size="xl" />
          <AdvancedSection aiIndex={aiIndex} indexManagementHref={indexManagementHref} />
        </>
      )}
    </div>
  );
};
