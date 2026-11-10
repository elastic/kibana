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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buildDreamingTemplateConfig } from '../../../common/dreaming_templates';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../ai_index_created_location_state';
import {
  DreamingConfigEditor,
  draftBuildsAnything,
  draftOf,
  typesOfDraft,
  type DreamingConfigDraft,
} from '../components/dreaming_config/dreaming_config_editor';
import { useApplyDreamingTemplate } from '../hooks/use_apply_dreaming_template';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useDreamingTemplate, useDreamingTemplates } from '../hooks/use_dreaming_templates';
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

const loadErrorTitle = i18n.translate('xpack.contextEngine.dreamingTemplate.loadErrorTitle', {
  defaultMessage: 'Unable to load the examples',
});

/** The choice of starting from nothing instead of an example. */
export const CUSTOM_TEMPLATE_ID = 'custom';

const EMPTY_DRAFT: DreamingConfigDraft = draftOf({});

const Highlight = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return <span css={{ color: euiTheme.colors.textPrimary }}>{children}</span>;
};

/** Outlined chips; the picked one is tinted and checked. */
const usePillStyles = () => {
  const { euiTheme } = useEuiTheme();
  const base = css`
    border-radius: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.regular};
    background: transparent;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    color: ${euiTheme.colors.textParagraph};
    &:hover:not(:disabled) {
      background: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;
  return {
    base,
    selected: css`
      ${base};
      font-weight: ${euiTheme.font.weight.medium};
      background: ${euiTheme.colors.backgroundLightPrimary};
      border-color: ${euiTheme.colors.borderBasePrimary};
      color: ${euiTheme.colors.textPrimary};
      &:hover:not(:disabled) {
        background: ${euiTheme.colors.backgroundLightPrimary};
      }
    `,
  };
};

interface PillProps {
  label: string;
  isSelected: boolean;
  iconType?: string;
  onClick: () => void;
  'data-test-subj': string;
}

const Pill = ({
  label,
  isSelected,
  iconType,
  onClick,
  'data-test-subj': dataTestSubj,
}: PillProps) => {
  const styles = usePillStyles();
  return (
    <EuiButton
      size="s"
      css={isSelected ? styles.selected : styles.base}
      color={isSelected ? 'primary' : 'text'}
      iconType={isSelected ? 'check' : iconType}
      isSelected={isSelected}
      onClick={onClick}
      data-test-subj={dataTestSubj}
    >
      {label}
    </EuiButton>
  );
};

/**
 * The step after creating an AI index with memory, on one screen: pick the example closest to
 * what's being built, or start from scratch, describe it, and shape what dreaming learns: fact
 * and procedure types, then entity types if wanted. Applying turns dreaming on; skipping saves
 * nothing. Either way it continues to the AI index's own onboarding.
 */
export const DreamingTemplatePage = () => {
  const { id: aiIndexId } = useParams<{ id: string }>();
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { templates, isLoading, error } = useDreamingTemplates();
  const [pickedId, setPickedId] = useState<string>();
  // Until edited, the description and the types are the example's.
  const [editedSummary, setEditedSummary] = useState<string>();
  const [edited, setEdited] = useState<{ id: string; draft: DreamingConfigDraft }>();
  const selectedId = pickedId ?? templates[0]?.id;
  const isCustom = selectedId === CUSTOM_TEMPLATE_ID;
  const { template, error: templateError } = useDreamingTemplate(isCustom ? undefined : selectedId);
  const { applyTemplate, isSaving } = useApplyDreamingTemplate();
  const detailPath = getAiIndexDetailPath(aiIndexId);

  useContextEngineBreadcrumbs([{ text: aiIndexId, path: detailPath }, { text: pageTitle }]);

  const proposed = useMemo(
    () =>
      isCustom
        ? EMPTY_DRAFT
        : template
        ? draftOf(template.dreaming, { entitiesEnabled: false })
        : undefined,
    [isCustom, template]
  );
  const draft = edited !== undefined && edited.id === selectedId ? edited.draft : proposed;
  const summary = editedSummary ?? (isCustom ? '' : template?.summary ?? '');
  const selected = templates.find(({ id }) => id === selectedId);

  const select = (id: string) => {
    if (id !== selectedId) {
      setPickedId(id);
      setEditedSummary(undefined);
    }
  };

  const continueToAiIndex = () =>
    navigateToContextEngine(detailPath, undefined, AI_INDEX_CREATED_LOCATION_STATE);

  const applyAndContinue = async () => {
    if (!draft) {
      return;
    }
    const config = buildDreamingTemplateConfig(
      {
        summary: '',
        rationale: '',
        dreaming: { ...(isCustom ? {} : template?.dreaming), ...typesOfDraft(draft) },
      },
      summary
    );
    if (await applyTemplate({ aiIndexId, config })) {
      continueToAiIndex();
    }
  };

  const canApply = draft !== undefined && draftBuildsAnything(draft);

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
                      'Start from the example closest to your agent, or from scratch. Dreaming turns this AI index’s memories and conversations into the facts and procedures below, and, once you turn them on, entities.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="xl" />
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.contextEngine.dreamingTemplate.examplesLabel', {
                  defaultMessage: 'What are you building?',
                })}
                helpText={
                  isCustom
                    ? i18n.translate('xpack.contextEngine.dreamingTemplate.customHelpText', {
                        defaultMessage: 'Start empty and add your own fact types.',
                      })
                    : selected?.description
                }
              >
                {isLoading ? (
                  <EuiSkeletonText lines={2} data-test-subj="contextDreamingTemplatesLoading" />
                ) : (
                  <EuiFlexGroup gutterSize="s" wrap responsive={false} role="group">
                    {templates.map(({ id, name }) => (
                      <EuiFlexItem grow={false} key={id}>
                        <Pill
                          label={name}
                          isSelected={id === selectedId}
                          onClick={() => select(id)}
                          data-test-subj={`contextDreamingTemplateOption-${id}`}
                        />
                      </EuiFlexItem>
                    ))}
                    <EuiFlexItem grow={false}>
                      <Pill
                        label={i18n.translate('xpack.contextEngine.dreamingTemplate.custom', {
                          defaultMessage: 'Custom',
                        })}
                        iconType="plus"
                        isSelected={isCustom}
                        onClick={() => select(CUSTOM_TEMPLATE_ID)}
                        data-test-subj={`contextDreamingTemplateOption-${CUSTOM_TEMPLATE_ID}`}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiFormRow>
              <EuiSpacer size="l" />
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.contextEngine.dreamingTemplate.summaryLabel', {
                  defaultMessage: 'Describe your company, your agent and the knowledge it needs',
                })}
                helpText={i18n.translate('xpack.contextEngine.dreamingTemplate.summaryHelpText', {
                  defaultMessage: 'Your description opens the instructions dreaming follows.',
                })}
              >
                <EuiTextArea
                  fullWidth
                  rows={3}
                  value={summary}
                  isLoading={!isCustom && !template && !templateError}
                  onChange={(event) => setEditedSummary(event.target.value)}
                  data-test-subj="contextDreamingTemplateSummary"
                />
              </EuiFormRow>
              {templateError && (
                <>
                  <EuiSpacer size="l" />
                  <KbnDangerCallout announceOnMount={false} title={loadErrorTitle} size="s">
                    {templateError.message}
                  </KbnDangerCallout>
                </>
              )}
              <EuiHorizontalRule margin="xl" />
              {draft && selectedId ? (
                <DreamingConfigEditor
                  draft={draft}
                  onChange={(next) => setEdited({ id: selectedId, draft: next })}
                />
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
                    title={
                      canApply
                        ? undefined
                        : i18n.translate('xpack.contextEngine.dreamingTemplate.applyDisabled', {
                            defaultMessage:
                              'Add a fact or procedure type, or turn on entities, for dreaming to learn something.',
                          })
                    }
                    data-test-subj="contextDreamingTemplateSave"
                  >
                    {i18n.translate('xpack.contextEngine.dreamingTemplate.applyButton', {
                      defaultMessage: 'Turn on dreaming',
                    })}
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
