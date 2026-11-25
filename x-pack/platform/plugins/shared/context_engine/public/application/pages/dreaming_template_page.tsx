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
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../ai_index_created_location_state';
import { DreamingConfigEditor } from '../components/dreaming_config/dreaming_config_editor';
import { DreamingTemplatePicker } from '../components/dreaming_setup/dreaming_template_picker';
import { useDreamingSetupDraft } from '../components/dreaming_setup/use_dreaming_setup_draft';
import {
  applyButtonLabel,
  applyDisabledTitle,
  customHelpText,
  examplesLabel,
  loadErrorTitle,
  summaryHelpText,
  summaryLabel,
} from '../components/dreaming_setup/translations';
import { useApplyDreamingTemplate } from '../hooks/use_apply_dreaming_template';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import { useNavigation } from '../hooks/use_navigation';
import {
  ContextEngineSubPageHeader,
  contextEngineBackDestinationLabel,
} from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { getAiIndexDetailPath } from '../paths';

const pageTitle = i18n.translate('xpack.contextEngine.dreamingTemplate.title', {
  defaultMessage: 'Set up dreaming',
});

const Highlight = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return <span css={{ color: euiTheme.colors.textPrimary }}>{children}</span>;
};

/**
 * Sets up dreaming for a new AI index with memory, from an example config or from scratch.
 * Applying turns dreaming on, skipping saves nothing, and both continue to the AI index's
 * onboarding.
 */
export const DreamingTemplatePage = () => {
  const { id: aiIndexId } = useParams<{ id: string }>();
  const isMemoryEnabled = useMemoryEnabled();
  return isMemoryEnabled ? (
    <DreamingTemplateSetup aiIndexId={aiIndexId} />
  ) : (
    <Redirect to={getAiIndexDetailPath(aiIndexId)} />
  );
};

const DreamingTemplateSetup = ({ aiIndexId }: { aiIndexId: string }) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
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
  const { applyTemplate, isSaving } = useApplyDreamingTemplate();
  const detailPath = getAiIndexDetailPath(aiIndexId);

  useContextEngineBreadcrumbs([{ text: aiIndexId, path: detailPath }, { text: pageTitle }]);

  const continueToAiIndex = () =>
    navigateToContextEngine(detailPath, undefined, AI_INDEX_CREATED_LOCATION_STATE);

  const applyAndContinue = async () => {
    const config = buildConfig();
    if (!config) {
      return;
    }
    if (await applyTemplate({ aiIndexId, config })) {
      continueToAiIndex();
    }
  };

  return (
    <ContextEnginePageTemplate data-test-subj="contextDreamingTemplatePage">
      <ContextEngineSubPageHeader
        backDestinationLabel={contextEngineBackDestinationLabel}
        backHref={createContextEngineUrl(detailPath)}
        onBackClick={(event) => {
          event.preventDefault();
          continueToAiIndex();
        }}
        pageTitle={pageTitle}
      />
      <ContextEnginePageSection>
        <EuiPanel hasBorder paddingSize="xl">
          {error ? (
            <KbnDangerCallout
              announceOnMount={false}
              title={loadErrorTitle}
              data-test-subj="contextDreamingTemplatesError"
            >
              {error.message}
            </KbnDangerCallout>
          ) : (
            <>
              <EuiTitle size="l">
                <h2>
                  <FormattedMessage
                    id="xpack.contextEngine.dreamingTemplate.heading"
                    defaultMessage="What should {dreaming} learn?"
                    values={{
                      dreaming: (
                        <Highlight>
                          {i18n.translate('xpack.contextEngine.dreamingTemplate.headingHighlight', {
                            defaultMessage: 'dreaming',
                          })}
                        </Highlight>
                      ),
                    }}
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued">
                <p>
                  {i18n.translate('xpack.contextEngine.dreamingTemplate.lead', {
                    defaultMessage:
                      'Start from the example closest to your agent, or from scratch. Dreaming turns this AI index’s memories and conversations into the facts below, and, once you turn them on, entities.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="xl" />
              <EuiFormRow
                fullWidth
                label={examplesLabel}
                helpText={isCustom ? customHelpText : selected?.description}
              >
                <DreamingTemplatePicker
                  templates={templates}
                  selectedId={selectedId}
                  isLoading={isLoading}
                  onSelect={select}
                />
              </EuiFormRow>
              <EuiSpacer size="l" />
              <EuiFormRow fullWidth label={summaryLabel} helpText={summaryHelpText}>
                <EuiTextArea
                  fullWidth
                  rows={3}
                  value={summary}
                  isLoading={isLoading}
                  onChange={(event) => setSummary(event.target.value)}
                  data-test-subj="contextDreamingTemplateSummary"
                />
              </EuiFormRow>
              <EuiHorizontalRule margin="xl" />
              {draft && selectedId ? (
                <DreamingConfigEditor draft={draft} onChange={setDraft} />
              ) : (
                <EuiSkeletonText lines={8} />
              )}
              <EuiHorizontalRule margin="xl" />
              <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="text"
                    onClick={continueToAiIndex}
                    data-test-subj="contextDreamingTemplateSkip"
                  >
                    {i18n.translate('xpack.contextEngine.dreamingTemplate.skipButton', {
                      defaultMessage: 'Skip for now',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={applyAndContinue}
                    isLoading={isSaving}
                    isDisabled={!canApply}
                    title={canApply ? undefined : applyDisabledTitle}
                    data-test-subj="contextDreamingTemplateSave"
                  >
                    {applyButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
