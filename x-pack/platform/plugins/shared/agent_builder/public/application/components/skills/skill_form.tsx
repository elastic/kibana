/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import type { CreateSkillPayload, UpdateSkillPayload } from '../../../../common/http_api/skills';
import { useSkillForm } from '../../hooks/skills/use_skill_form';
import { useTools } from '../../hooks/tools/use_tools';
import { useKibana } from '../../hooks/use_kibana';
import { useNavigation } from '../../hooks/use_navigation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { SkillReferencedContentFieldArray } from './skill_referenced_content_field_array';
import type { SkillFormData } from './skill_form_validation';
import { SkillEvalSection } from './skill_eval_section';
import { useSkillBrowserApiTools } from './use_skill_browser_api_tools';
import { useAesopSuggestions } from './use_aesop_suggestions';
import type { EvalResults } from './types';
import { buildInitialMessage, buildSidebarAttachments } from './skill_chat_helpers';

export enum SkillFormMode {
  Create = 'create',
  Edit = 'edit',
  View = 'view',
}

interface FormSectionProps {
  id: string;
  icon: IconType;
  title: string;
  description: string;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ id, icon, title, description, children }) => (
  <EuiFlexGroup direction="row" gutterSize="xl" alignItems="flexStart" aria-labelledby={id}>
    <EuiFlexItem grow={1}>
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiIcon type={icon} />
          <EuiTitle size="xs">
            <h2 id={id}>{title}</h2>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={2} css={formFlexColumnStyles}>
      {children}
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface SkillFormBaseProps {
  skill?: PublicSkillDefinition;
  isLoading: boolean;
}

interface SkillFormCreateProps extends SkillFormBaseProps {
  mode: SkillFormMode.Create;
  isSubmitting: boolean;
  onSave: (data: CreateSkillPayload) => Promise<unknown>;
}

interface SkillFormEditProps extends SkillFormBaseProps {
  mode: SkillFormMode.Edit;
  isSubmitting: boolean;
  onSave: (data: UpdateSkillPayload) => Promise<unknown>;
}

interface SkillFormViewProps extends SkillFormBaseProps {
  mode: SkillFormMode.View;
  isSubmitting?: never;
  onSave?: never;
}

export type SkillFormProps = SkillFormCreateProps | SkillFormEditProps | SkillFormViewProps;

const formFlexColumnStyles = css`
  min-width: 0;
`;

interface SkillFormContentProps {
  mode: SkillFormMode;
  skill?: PublicSkillDefinition;
  form: ReturnType<typeof useSkillForm>;
  toolOptions: Array<{ label: string; value: string }>;
  connectorId: string;
  http: ReturnType<typeof useKibana>['services']['http'];
  isEvalsAvailable: boolean;
  onSubmit: (data: SkillFormData) => Promise<void>;
  onOpenChat: (evalResults?: EvalResults) => void;
  onApplyImprovement: (data: { name: string; description: string; content: string }) => void;
}

const SkillFormContent: React.FC<SkillFormContentProps> = ({
  mode,
  skill,
  form,
  toolOptions,
  connectorId,
  http,
  isEvalsAvailable,
  onSubmit,
  onOpenChat,
  onApplyImprovement,
}) => {
  const { control, handleSubmit } = form;
  const isViewMode = mode === SkillFormMode.View;
  const isCreateMode = mode === SkillFormMode.Create;

  const { suggestionsBySkillId } = useAesopSuggestions();
  const aesopSuggestion = skill ? suggestionsBySkillId.get(skill.id) : undefined;

  return (
    <EuiForm
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      data-test-subj="agentBuilderSkillForm"
    >
      {/* Section: Skill identity */}
      <EuiSpacer size="l" />
      <FormSection
        id="skill-identity-section-title"
        icon="bullseye"
        title={i18n.translate('xpack.agentBuilder.skills.form.identityTitle', {
          defaultMessage: 'Skill identity',
        })}
        description={i18n.translate('xpack.agentBuilder.skills.form.identityDescription', {
          defaultMessage:
            "Define the skill's unique identifier and display name. The ID is used to reference the skill in configurations.",
        })}
      >
        <EuiSpacer size="s" />
        {isCreateMode && (
          <Controller
            name="id"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={labels.skills.skillIdLabel}
                isInvalid={!!error}
                error={error?.message}
                fullWidth
              >
                <EuiFieldText
                  {...field}
                  fullWidth
                  isInvalid={!!error}
                  disabled={isViewMode}
                  data-test-subj="agentBuilderSkillFormIdInput"
                  placeholder={i18n.translate('xpack.agentBuilder.skills.form.idPlaceholder', {
                    defaultMessage: 'Enter skill ID',
                  })}
                />
              </EuiFormRow>
            )}
          />
        )}

        <Controller
          name="name"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.nameLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiFieldText
                {...field}
                fullWidth
                isInvalid={!!error}
                disabled={isViewMode}
                data-test-subj="agentBuilderSkillFormNameInput"
                placeholder={i18n.translate('xpack.agentBuilder.skills.form.namePlaceholder', {
                  defaultMessage: 'Enter skill name',
                })}
              />
            </EuiFormRow>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.descriptionLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiTextArea
                {...field}
                fullWidth
                isInvalid={!!error}
                disabled={isViewMode}
                rows={3}
                data-test-subj="agentBuilderSkillFormDescriptionInput"
                placeholder={i18n.translate(
                  'xpack.agentBuilder.skills.form.descriptionPlaceholder',
                  {
                    defaultMessage: 'Brief description of what this skill does',
                  }
                )}
              />
            </EuiFormRow>
          )}
        />
      </FormSection>

      <EuiHorizontalRule />

      {/* Section: Instructions */}
      <FormSection
        id="skill-instructions-section-title"
        icon="document"
        title={i18n.translate('xpack.agentBuilder.skills.form.instructionsTitle', {
          defaultMessage: 'Instructions',
        })}
        description={i18n.translate('xpack.agentBuilder.skills.form.instructionsDescription', {
          defaultMessage:
            'Write the markdown instructions that define what this skill does and how agents should use it. This is the core content of the skill.',
        })}
      >
        <Controller
          name="content"
          control={control}
          render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.contentLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiMarkdownEditor
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                readOnly={isViewMode}
                data-test-subj="agentBuilderSkillFormContentInput"
                aria-label={i18n.translate('xpack.agentBuilder.skills.form.contentEditorLabel', {
                  defaultMessage: 'Skill instructions editor',
                })}
              />
            </EuiFormRow>
          )}
        />
      </FormSection>

      <EuiHorizontalRule />

      {/* Section: Additional referenced files */}
      <FormSection
        id="skill-referenced-content-section-title"
        icon="documents"
        title={labels.skills.referencedContentLabel}
        description={labels.skills.referencedFileSection.description}
      >
        <SkillReferencedContentFieldArray control={control} readOnly={isViewMode} />
      </FormSection>

      <EuiHorizontalRule />

      {/* Section: Associated tools */}
      <FormSection
        id="skill-tools-section-title"
        icon="wrench"
        title={i18n.translate('xpack.agentBuilder.skills.form.toolsTitle', {
          defaultMessage: 'Associated tools',
        })}
        description={i18n.translate('xpack.agentBuilder.skills.form.toolsDescription', {
          defaultMessage:
            'Select tools that this skill requires. When an agent uses this skill, these tools will be available to it. A maximum of 5 tools can be associated with a skill.',
        })}
      >
        <Controller
          name="tool_ids"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.toolIdsLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiComboBox
                fullWidth
                options={toolOptions}
                selectedOptions={value.map((toolId) => ({
                  label: toolId,
                  value: toolId,
                }))}
                onChange={(selected) => onChange(selected.map((opt) => opt.value as string))}
                isDisabled={isViewMode}
                data-test-subj="agentBuilderSkillFormToolIdsInput"
                placeholder={i18n.translate('xpack.agentBuilder.skills.form.toolsPlaceholder', {
                  defaultMessage: 'Select tools',
                })}
              />
            </EuiFormRow>
          )}
        />
      </FormSection>

      {/* Section: Evaluation — only shown for existing skills when the
          evals plugin is available (xpack.evals.enabled=true). */}
      {!isCreateMode && skill && isEvalsAvailable && (
        <>
          <EuiHorizontalRule />
          <FormSection
            id="skill-evaluation-section-title"
            icon="beaker"
            title={i18n.translate('xpack.agentBuilder.skills.form.evaluationTitle', {
              defaultMessage: 'Evaluation',
            })}
            description={i18n.translate('xpack.agentBuilder.skills.form.evaluationDescription', {
              defaultMessage:
                'Generate test cases and run online evaluations to measure how well an agent performs with this skill. Results appear in the Evaluations app.',
            })}
          >
            <SkillEvalSection
              skillId={skill.id}
              connectorId={connectorId}
              http={http}
              skillName={form.getValues('name')}
              skillContent={form.getValues('content')}
              isReadonly={skill.readonly}
              aesopSuggestion={aesopSuggestion}
              onOpenChat={onOpenChat}
              onApplyImprovement={onApplyImprovement}
            />
          </FormSection>
        </>
      )}
    </EuiForm>
  );
};

export const SkillForm: React.FC<SkillFormProps> = ({
  mode,
  skill,
  isLoading,
  isSubmitting,
  onSave,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: {
      http,
      plugins,
      application: { navigateToUrl },
      overlays: { openConfirm },
      appParams: { history },
    },
  } = useKibana();
  const isEvalsAvailable = Boolean(plugins.evals);
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { openSidebarConversation } = useAgentBuilderServices();
  const { tools } = useTools();
  const { selectedConnector, defaultConnectorId } = useConnectorSelection();
  const connectorId = selectedConnector ?? defaultConnectorId ?? '';
  const form = useSkillForm();
  const {
    reset,
    formState: { errors, isDirty, isSubmitSuccessful },
    handleSubmit,
  } = form;
  const isViewMode = mode === SkillFormMode.View;
  const isCreateMode = mode === SkillFormMode.Create;
  const hasErrors = Object.keys(errors).length > 0;

  const deferNavigateToAgentBuilderUrl = useCallback(
    (path: string) => {
      defer(() => navigateToAgentBuilderUrl(path));
    },
    [navigateToAgentBuilderUrl]
  );

  const browserApiTools = useSkillBrowserApiTools({
    form,
    isReadonly: skill?.readonly ?? false,
    onNavigateToCreate: (data) => {
      deferNavigateToAgentBuilderUrl(
        `${appPaths.skills.new}?prefill=${encodeURIComponent(JSON.stringify(data))}`
      );
    },
  });

  // Opens the main AI Assistant sidebar with skill context + browser tools
  const handleOpenChat = useCallback(
    (evalResults?: EvalResults) => {
      const { name, description, content } = form.getValues();
      const initialMessage = buildInitialMessage({
        isCreateMode,
        evalResults,
        skillName: name,
      });

      openSidebarConversation({
        newConversation: true,
        sessionTag: `skill-editor-${skill?.id ?? 'new'}`,
        initialMessage,
        autoSendInitialMessage: !!initialMessage,
        attachments: buildSidebarAttachments({
          skillName: name,
          skillDescription: description,
          skillContent: content,
          isReadonly: skill?.readonly ?? false,
          evalResults,
        }),
        browserApiTools,
      });
    },
    [form, isCreateMode, skill?.id, skill?.readonly, openSidebarConversation, browserApiTools]
  );

  // Applies LLM-generated improvement to the form (writable) or navigates to Create (readonly)
  const handleApplyImprovement = useCallback(
    (data: { name: string; description: string; content: string }) => {
      if (skill?.readonly) {
        deferNavigateToAgentBuilderUrl(
          `${appPaths.skills.new}?prefill=${encodeURIComponent(JSON.stringify(data))}`
        );
      } else {
        form.setValue('name', data.name, { shouldDirty: true });
        form.setValue('description', data.description, { shouldDirty: true });
        form.setValue('content', data.content, { shouldDirty: true });
      }
    },
    [skill?.readonly, form, deferNavigateToAgentBuilderUrl]
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: !isViewMode && isDirty && !isSubmitSuccessful,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  useEffect(() => {
    if (skill) {
      reset({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        content: skill.content,
        tool_ids: skill.tool_ids ?? [],
        referenced_content: skill.referenced_content ?? [],
      });
    }
  }, [skill, reset]);

  // Prefill support: when navigating from eval improvement → create skill
  useEffect(() => {
    if (!isCreateMode) return;
    try {
      const params = new URLSearchParams(history.location.search);
      const prefillRaw = params.get('prefill');
      if (!prefillRaw) return;
      const prefill = JSON.parse(decodeURIComponent(prefillRaw)) as {
        name?: string;
        description?: string;
        content?: string;
      };
      reset({
        id: '',
        name: prefill.name ?? '',
        description: prefill.description ?? '',
        content: prefill.content ?? '',
        tool_ids: [],
      });
    } catch {
      // Invalid prefill — ignore
    }
  }, [isCreateMode, reset, history.location.search]);

  const toolOptions = useMemo(
    () =>
      tools.map((tool) => ({
        label: tool.id,
        value: tool.id,
      })),
    [tools]
  );

  const onSubmit = useCallback(
    async (data: SkillFormData) => {
      if (!onSave) return;

      if (mode === SkillFormMode.Create) {
        await (onSave as (d: CreateSkillPayload) => Promise<unknown>)({
          id: data.id,
          name: data.name,
          description: data.description,
          content: data.content,
          tool_ids: data.tool_ids,
          referenced_content: data.referenced_content,
        });
      } else if (mode === SkillFormMode.Edit) {
        await (onSave as (d: UpdateSkillPayload) => Promise<unknown>)({
          name: data.name,
          description: data.description,
          content: data.content,
          tool_ids: data.tool_ids,
          referenced_content: data.referenced_content,
        });
      }
      reset(data, { keepDirty: false });
      deferNavigateToAgentBuilderUrl(appPaths.skills.list);
    },
    [onSave, mode, reset, deferNavigateToAgentBuilderUrl]
  );

  const pageTitle = useMemo(() => {
    if (mode === SkillFormMode.Create) return labels.skills.newSkillTitle;
    if (mode === SkillFormMode.Edit) return skill?.id ?? labels.skills.editSkillTitle;
    return skill?.id ?? '';
  }, [mode, skill]);

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate bottomBorder={false} data-test-subj="agentBuilderSkillFormPage">
        <KibanaPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>{pageTitle}</EuiFlexItem>
              {skill?.readonly && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    iconType="lock"
                    data-test-subj="agentBuilderSkillReadOnlyBadge"
                  >
                    {labels.skills.readOnly}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          rightSideItems={[
            ...(isViewMode
              ? []
              : [
                  <EuiButton
                    key="save"
                    size="m"
                    fill
                    iconType="save"
                    onClick={handleSubmit(onSubmit)}
                    disabled={hasErrors || isSubmitting || (!isCreateMode && !isDirty)}
                    isLoading={isSubmitting}
                    data-test-subj="agentBuilderSkillFormSaveButton"
                  >
                    {labels.skills.saveButtonLabel}
                  </EuiButton>,
                ]),
            <EuiButton
              key="chat-toggle"
              iconType="sparkles"
              color="text"
              onClick={() => handleOpenChat()}
              data-test-subj="agentBuilderSkillFormChatToggle"
            >
              {i18n.translate('xpack.agentBuilder.skills.form.generateWithAgent', {
                defaultMessage: 'Generate with Agent',
              })}
            </EuiButton>,
          ]}
          rightSideGroupProps={{ gutterSize: 's' }}
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border-block-end: none;
          `}
        />
        <KibanaPageTemplate.Section>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiLoadingSpinner size="xxl" />
            </EuiFlexGroup>
          ) : (
            <SkillFormContent
              mode={mode}
              skill={skill}
              form={form}
              toolOptions={toolOptions}
              connectorId={connectorId}
              http={http}
              isEvalsAvailable={isEvalsAvailable}
              onSubmit={onSubmit}
              onOpenChat={handleOpenChat}
              onApplyImprovement={handleApplyImprovement}
            />
          )}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </FormProvider>
  );
};
