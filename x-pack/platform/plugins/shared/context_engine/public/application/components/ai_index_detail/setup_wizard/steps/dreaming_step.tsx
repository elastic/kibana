/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getRouterLinkProps } from '@kbn/router-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../../common/telemetry';
import { useApplyDreamingTemplate } from '../../../../hooks/use_apply_dreaming_template';
import { useNavigation } from '../../../../hooks/use_navigation';
import { getAiIndexSettingsPath } from '../../../../paths';
import {
  DreamingConfigEditor,
  isDreamingSetUp,
} from '../../../dreaming_config/dreaming_config_editor';
import { DreamingTemplatePicker } from '../../../dreaming_setup/dreaming_template_picker';
import {
  applyDisabledTitle,
  customHelpText,
  loadErrorTitle,
  startFromLabel,
  summaryHelpText,
  summaryLabel,
} from '../../../dreaming_setup/translations';
import { useDreamingSetupDraft } from '../../../dreaming_setup/use_dreaming_setup_draft';
import { SetupWizardStepLayout } from '../setup_wizard_step_layout';
import type { SetupWizardStep, SetupWizardStepContentProps } from '../types';

const dreamingStepId = 'dreaming';

const settingsLinkLabel = i18n.translate('xpack.contextEngine.setupWizard.dreaming.settingsLink', {
  defaultMessage: 'Settings',
});

const DreamingSetUpNote = ({ aiIndexId }: { aiIndexId: string }) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const settingsPath = getAiIndexSettingsPath(aiIndexId);
  const { href, onClick } = getRouterLinkProps({
    href: createContextEngineUrl(settingsPath),
    onClick: () => navigateToContextEngine(settingsPath),
  });

  return (
    <EuiText size="s" data-test-subj="contextSetupWizardDreamingSetUp">
      <p>
        <FormattedMessage
          id="xpack.contextEngine.setupWizard.dreaming.setUpNote"
          defaultMessage="Dreaming is set up. To change it, open {settingsLink}."
          values={{
            settingsLink: (
              <EuiLink
                href={href}
                onClick={onClick}
                data-test-subj="contextSetupWizardDreamingSettingsLink"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSetupWizard,
                  action: CONTEXT_ENGINE_UI_EBT.action.setupWizard.OPEN_SETTINGS,
                  detail: dreamingStepId,
                })}
              >
                {settingsLinkLabel}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};

const DreamingSetupStepForm = ({ aiIndex, layout }: SetupWizardStepContentProps) => {
  const { applyTemplate } = useApplyDreamingTemplate();
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
  } = useDreamingSetupDraft({ preselectFirst: false });

  const save = async (): Promise<boolean> => {
    const config = buildConfig();
    return config !== undefined && applyTemplate({ aiIndexId: aiIndex.id, config });
  };

  const layoutProps = {
    ...layout,
    // A draft that saves nothing offers Skip again, so the user is never stuck on the step.
    hasChanges: canApply,
    // Done elsewhere meanwhile (e.g. Settings in another tab): Continue moves on without saving.
    canContinue: canApply || layout.isDone,
    onSave: save,
  };

  if (error) {
    return (
      <SetupWizardStepLayout {...layoutProps}>
        <KbnDangerCallout title={loadErrorTitle} data-test-subj="contextDreamingTemplatesError">
          {error.message}
        </KbnDangerCallout>
      </SetupWizardStepLayout>
    );
  }

  const aboutTemplate = isCustom ? customHelpText : selected?.description;

  return (
    <SetupWizardStepLayout {...layoutProps}>
      <DreamingTemplatePicker
        ariaLabel={startFromLabel}
        templates={templates}
        selectedId={selectedId}
        isLoading={isLoading}
        onSelect={select}
      />
      {draft && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued" data-test-subj="contextSetupWizardDreamingAbout">
            <p>{aboutTemplate}</p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFormRow label={summaryLabel} helpText={summaryHelpText} fullWidth>
            <EuiTextArea
              fullWidth
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              // Text typed during the save would not be saved.
              disabled={layout.isBusy}
              data-test-subj="contextSetupWizardDreamingSummary"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <DreamingConfigEditor draft={draft} onChange={setDraft} />
          {!canApply && (
            <>
              <EuiSpacer size="m" />
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="contextSetupWizardDreamingLearnsNothing"
              >
                <p>{applyDisabledTitle}</p>
              </EuiText>
            </>
          )}
        </>
      )}
    </SetupWizardStepLayout>
  );
};

const DreamingStepContent = (props: SetupWizardStepContentProps) => {
  const { aiIndex, layout } = props;
  // Read once: after Continue saves, the step stays on its form until the wizard moves on.
  const [wasDoneOnOpen] = useState(layout.isDone);

  if (!wasDoneOnOpen) {
    return <DreamingSetupStepForm {...props} />;
  }
  return (
    <SetupWizardStepLayout {...layout}>
      <DreamingSetUpNote aiIndexId={aiIndex.id} />
    </SetupWizardStepLayout>
  );
};

export const dreamingStep: SetupWizardStep = {
  id: dreamingStepId,
  texts: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.dreaming.stepTitle', {
      defaultMessage: 'Shape dreaming',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.dreaming.title', {
      defaultMessage: 'Shape what dreaming learns',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.dreaming.description', {
      defaultMessage:
        'Dreaming reads what your agent saves and turns it into facts. Pick the template closest to your agent. You can change it later in Settings.',
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.dreaming.docsLink', {
      defaultMessage: 'How dreaming works',
    }),
  },
  getDocsLink: ({ memory }) => memory,
  // Without memory there is no dreaming.
  isAvailable: ({ isMemoryEnabled }) => isMemoryEnabled,
  isDone: ({ dreaming }) => dreaming !== undefined && isDreamingSetUp(dreaming),
  Content: DreamingStepContent,
};
