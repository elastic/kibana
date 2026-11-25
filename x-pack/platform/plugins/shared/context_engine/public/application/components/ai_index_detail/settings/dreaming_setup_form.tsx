/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React from 'react';
import { DreamingTemplatePicker } from '../../dreaming_setup/dreaming_template_picker';
import {
  applyDisabledTitle,
  customHelpText,
  discardChangesLabel,
  loadErrorTitle,
  saveChangesLabel,
  summaryHelpText,
  summaryLabel,
} from '../../dreaming_setup/translations';
import { useDreamingSetupDraft } from '../../dreaming_setup/use_dreaming_setup_draft';
import type { DreamingTemplateConfig } from '../../../../../common/dreaming_templates';
import { DreamingLearnsRows } from './dreaming_learns_rows';
import { SettingsRow } from './settings_row';

const startFromLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.setup.startFrom',
  {
    defaultMessage: 'Start from',
  }
);

interface DreamingSetupFormProps {
  isSaving: boolean;
  onApply: (config: DreamingTemplateConfig) => Promise<boolean>;
  onDiscard: () => void;
}

export const DreamingSetupForm = ({ isSaving, onApply, onDiscard }: DreamingSetupFormProps) => {
  const {
    templates,
    isLoading,
    error,
    selectedId,
    isCustom,
    selected,
    select,
    summary,
    setSummary,
    draft,
    setDraft,
    canApply,
    buildConfig,
  } = useDreamingSetupDraft();

  const apply = async () => {
    const config = buildConfig();
    if (config) {
      await onApply(config);
    }
  };

  if (error) {
    return (
      <KbnDangerCallout title={loadErrorTitle} data-test-subj="contextDreamingTemplatesError">
        {error.message}
      </KbnDangerCallout>
    );
  }

  return (
    <>
      <SettingsRow
        title={startFromLabel}
        description={isCustom ? customHelpText : selected?.description ?? ''}
      >
        <DreamingTemplatePicker
          templates={templates}
          selectedId={selectedId}
          isLoading={isLoading}
          onSelect={select}
        />
      </SettingsRow>
      <EuiHorizontalRule margin="m" />
      <SettingsRow title={summaryLabel} description={summaryHelpText}>
        <EuiTextArea
          fullWidth
          rows={3}
          value={summary}
          isLoading={isLoading}
          onChange={(event) => setSummary(event.target.value)}
          aria-label={summaryLabel}
          data-test-subj="contextAiIndexDreamingSetupSummary"
        />
      </SettingsRow>
      <EuiHorizontalRule margin="m" />
      <DreamingLearnsRows draft={draft} onChange={setDraft} />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onDiscard}
            isDisabled={isSaving}
            data-test-subj="contextAiIndexDreamingSetupDiscard"
          >
            {discardChangesLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={apply}
            isLoading={isSaving}
            isDisabled={!canApply}
            title={canApply ? undefined : applyDisabledTitle}
            data-test-subj="contextAiIndexDreamingSetupSave"
          >
            {saveChangesLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
