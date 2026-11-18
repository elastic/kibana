/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { useMemoryEnabled } from '../../../hooks/use_memory_enabled';
import { AdvancedSection } from './advanced_section';
import { AutomationsSection } from './automations_section';
import { DreamingPanel } from './dreaming_panel';
import { GeneralSection } from './general_section';

interface SettingsTabProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isAutomationsUnlocked: boolean;
  indexManagementHref: string | undefined;
}

export const SettingsTab = ({
  isLoading,
  aiIndex,
  onSaved,
  isAutomationsUnlocked,
  indexManagementHref,
}: SettingsTabProps) => {
  const isMemoryEnabled = useMemoryEnabled();

  return (
    <div data-test-subj="contextAiIndexSettingsTab">
      <GeneralSection isLoading={isLoading} aiIndex={aiIndex} onSaved={onSaved} />
      {isMemoryEnabled && aiIndex && (
        <>
          <EuiSpacer size="xl" />
          <DreamingPanel aiIndex={aiIndex} />
        </>
      )}
      <EuiSpacer size="xl" />
      <AutomationsSection
        isLoading={isLoading}
        aiIndex={aiIndex}
        onSaved={onSaved}
        isUnlocked={isAutomationsUnlocked}
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
