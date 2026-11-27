/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useSaveAiIndexSources } from '../../../../hooks/use_save_ai_index_sources';
import { toSelectedSources } from '../../../../utils/sources';
import { SourcesPanel } from '../../sources/sources_panel';
import type { SelectedSource } from '../../sources/types';
import { SetupWizardStepLayout } from '../setup_wizard_step_layout';
import type { SetupWizardStep, SetupWizardStepContentProps } from '../types';

// The Sources tab's editor: each change saves right away, then the AI index reloads.
const SourcesStepContent = ({
  aiIndex,
  onSaved,
  onBusyChange,
  layout,
}: SetupWizardStepContentProps) => {
  const { saveSources } = useSaveAiIndexSources();
  // Picked in an add panel but not added yet. Continue adds them, so they are not lost.
  const [pendingSources, setPendingSources] = useState<SelectedSource[]>([]);

  return (
    <SetupWizardStepLayout
      {...layout}
      hasChanges={pendingSources.length > 0}
      onSave={() =>
        saveSources(aiIndex, [...toSelectedSources(aiIndex.sources), ...pendingSources])
      }
    >
      <SourcesPanel
        isLoading={false}
        aiIndex={aiIndex}
        onSaved={onSaved}
        isManaged={false}
        showDescription={false}
        onSavingChange={onBusyChange}
        onPendingChange={setPendingSources}
      />
    </SetupWizardStepLayout>
  );
};

export const sourcesStep: SetupWizardStep = {
  id: 'sources',
  texts: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.sources.stepTitle', {
      defaultMessage: 'Add sources',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.sources.title', {
      defaultMessage: 'Add sources',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.sources.description', {
      defaultMessage:
        "Context reads an index or a connected app and writes knowledge documents from it. Your agent's memories are enough to start, so you can skip this and add sources later.",
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.sources.docsLink', {
      defaultMessage: 'Sources and automations',
    }),
  },
  getDocsLink: ({ sources }) => sources,
  isDone: ({ aiIndex }) => aiIndex.sources.length > 0,
  isOptional: true,
  Content: SourcesStepContent,
};
