/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
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
  EuiPanel,
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
import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import type { CreateSkillPayload, UpdateSkillPayload } from '../../../../common/http_api/skills';
import { useSkillForm } from '../../hooks/skills/use_skill_form';
import { useTools } from '../../hooks/tools/use_tools';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import type { SkillFormData } from './skill_form_validation';

export enum SkillFormMode {
  Create = 'create',
  Edit = 'edit',
  View = 'view',
}

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

export const SkillForm: React.FC<SkillFormProps> = ({
  mode,
  skill,
  isLoading,
  isSubmitting,
  onSave,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { tools } = useTools();
  const form = useSkillForm();
  const {
    control,
    reset,
    formState: { errors },
    handleSubmit,
  } = form;

  const isViewMode = mode === SkillFormMode.View;
  const isCreateMode = mode === SkillFormMode.Create;
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (skill) {
      reset({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        content: skill.content,
        tool_ids: skill.tool_ids ?? [],
      });
    }
  }, [skill, reset]);

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
        await onSave({
          id: data.id,
          name: data.name,
          description: data.description,
          content: data.content,
          tool_ids: data.tool_ids,
        });
      } else {
        await (onSave as (d: UpdateSkillPayload) => Promise<unknown>)({
          name: data.name,
          description: data.description,
          content: data.content,
          tool_ids: data.tool_ids,
        });
      }
      navigateToAgentBuilderUrl(appPaths.skills.list);
    },
    [onSave, mode, navigateToAgentBuilderUrl]
  );

  const handleCancel = useCallback(() => {
    navigateToAgentBuilderUrl(appPaths.skills.list);
  }, [navigateToAgentBuilderUrl]);

  const pageTitle = useMemo(() => {
    if (mode === SkillFormMode.Create) return labels.skills.newSkillTitle;
    if (mode === SkillFormMode.Edit) return skill?.id ?? labels.skills.editSkillTitle;
    return skill?.id ?? '';
  }, [mode, skill]);

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate panelled bottomBorder={false} data-test-subj="agentBuilderSkillFormPage">
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
            <EuiForm
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              data-test-subj="agentBuilderSkillForm"
            >
              {/* Section: Skill identity */}
              <EuiSpacer size="l" />
              <EuiFlexGroup
                direction="row"
                gutterSize="xl"
                alignItems="flexStart"
                aria-labelledby="skill-identity-section-title"
              >
                <EuiFlexItem grow={1}>
                  <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                      <EuiIcon type="bullseye" />
                      <EuiTitle size="xs">
                        <h2 id="skill-identity-section-title">
                          {i18n.translate('xpack.agentBuilder.skills.form.identityTitle', {
                            defaultMessage: 'Skill identity',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexGroup>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.agentBuilder.skills.form.identityDescription', {
                        defaultMessage:
                          "Define the skill's unique identifier and display name. The ID is used to reference the skill in configurations.",
                      })}
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false} color="subdued">
                      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                        {isCreateMode && (
                          <>
                            <EuiTitle size="xxs">
                              <span>
                                {i18n.translate('xpack.agentBuilder.skills.form.skillIdHint', {
                                  defaultMessage: 'Skill ID',
                                })}
                              </span>
                            </EuiTitle>
                            <EuiText size="s" color="subdued">
                              {i18n.translate(
                                'xpack.agentBuilder.skills.form.skillIdHintDescription',
                                {
                                  defaultMessage:
                                    'A unique identifier for the skill, used in code and configurations. Cannot be changed after creation.',
                                }
                              )}
                            </EuiText>
                            <EuiSpacer size="s" />
                          </>
                        )}
                        <EuiTitle size="xxs">
                          <span>
                            {i18n.translate('xpack.agentBuilder.skills.form.nameHint', {
                              defaultMessage: 'Name',
                            })}
                          </span>
                        </EuiTitle>
                        <EuiText size="s" color="subdued">
                          {i18n.translate('xpack.agentBuilder.skills.form.nameHintDescription', {
                            defaultMessage:
                              'A human-friendly display name for the skill, visible to users.',
                          })}
                        </EuiText>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={2} css={formFlexColumnStyles}>
                  {isCreateMode && (
                    <Controller
                      name="id"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <EuiFormRow
                          label={labels.skills.skillIdLabel}
                          isInvalid={!!error}
                          error={error?.message}
                        >
                          <EuiFieldText
                            {...field}
                            isInvalid={!!error}
                            disabled={isViewMode}
                            data-test-subj="agentBuilderSkillFormIdInput"
                            placeholder={i18n.translate(
                              'xpack.agentBuilder.skills.form.idPlaceholder',
                              { defaultMessage: 'Enter skill ID' }
                            )}
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
                      >
                        <EuiFieldText
                          {...field}
                          isInvalid={!!error}
                          disabled={isViewMode}
                          data-test-subj="agentBuilderSkillFormNameInput"
                          placeholder={i18n.translate(
                            'xpack.agentBuilder.skills.form.namePlaceholder',
                            { defaultMessage: 'Enter skill name' }
                          )}
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
                      >
                        <EuiTextArea
                          {...field}
                          isInvalid={!!error}
                          disabled={isViewMode}
                          rows={3}
                          data-test-subj="agentBuilderSkillFormDescriptionInput"
                          placeholder={i18n.translate(
                            'xpack.agentBuilder.skills.form.descriptionPlaceholder',
                            { defaultMessage: 'Brief description of what this skill does' }
                          )}
                        />
                      </EuiFormRow>
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule />

              {/* Section: Instructions */}
              <EuiFlexGroup
                direction="row"
                gutterSize="xl"
                alignItems="flexStart"
                aria-labelledby="skill-instructions-section-title"
              >
                <EuiFlexItem grow={1}>
                  <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                      <EuiIcon type="document" />
                      <EuiTitle size="xs">
                        <h2 id="skill-instructions-section-title">
                          {i18n.translate('xpack.agentBuilder.skills.form.instructionsTitle', {
                            defaultMessage: 'Instructions',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexGroup>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.agentBuilder.skills.form.instructionsDescription', {
                        defaultMessage:
                          'Write the markdown instructions that define what this skill does and how agents should use it. This is the core content of the skill.',
                      })}
                    </EuiText>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={2} css={formFlexColumnStyles}>
                  <Controller
                    name="content"
                    control={control}
                    render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                      <EuiFormRow
                        label={labels.skills.contentLabel}
                        isInvalid={!!error}
                        error={error?.message}
                      >
                        <EuiMarkdownEditor
                          value={value}
                          onChange={onChange}
                          onBlur={onBlur}
                          readOnly={isViewMode}
                          data-test-subj="agentBuilderSkillFormContentInput"
                          aria-label={i18n.translate(
                            'xpack.agentBuilder.skills.form.contentEditorLabel',
                            { defaultMessage: 'Skill instructions editor' }
                          )}
                        />
                      </EuiFormRow>
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule />

              {/* Section: Associated tools */}
              <EuiFlexGroup
                direction="row"
                gutterSize="xl"
                alignItems="flexStart"
                aria-labelledby="skill-tools-section-title"
              >
                <EuiFlexItem grow={1}>
                  <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                      <EuiIcon type="wrench" />
                      <EuiTitle size="xs">
                        <h2 id="skill-tools-section-title">
                          {i18n.translate('xpack.agentBuilder.skills.form.toolsTitle', {
                            defaultMessage: 'Associated tools',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexGroup>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.agentBuilder.skills.form.toolsDescription', {
                        defaultMessage:
                          'Select tools that this skill requires. When an agent uses this skill, these tools will be available to it. A maximum of 5 tools can be associated with a skill.',
                      })}
                    </EuiText>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={2} css={formFlexColumnStyles}>
                  <Controller
                    name="tool_ids"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <EuiFormRow label={labels.skills.toolIdsLabel}>
                        <EuiComboBox
                          options={toolOptions}
                          selectedOptions={value.map((toolId) => ({
                            label: toolId,
                            value: toolId,
                          }))}
                          onChange={(selected) =>
                            onChange(selected.map((opt) => opt.value as string))
                          }
                          isDisabled={isViewMode}
                          data-test-subj="agentBuilderSkillFormToolIdsInput"
                          placeholder={i18n.translate(
                            'xpack.agentBuilder.skills.form.toolsPlaceholder',
                            { defaultMessage: 'Select tools' }
                          )}
                        />
                      </EuiFormRow>
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          )}
        </KibanaPageTemplate.Section>
        {!isViewMode && (
          <KibanaPageTemplate.BottomBar
            css={css`
              z-index: ${euiTheme.levels.header};
            `}
            paddingSize="m"
            restrictWidth={false}
            position="fixed"
            usePortal
          >
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  aria-label={labels.skills.cancelButtonLabel}
                  size="s"
                  iconType="cross"
                  color="text"
                  onClick={handleCancel}
                  data-test-subj="agentBuilderSkillFormCancelButton"
                >
                  {labels.skills.cancelButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  type="submit"
                  fill
                  iconType="save"
                  onClick={handleSubmit(onSubmit)}
                  disabled={hasErrors || isSubmitting}
                  isLoading={isSubmitting}
                  data-test-subj="agentBuilderSkillFormSaveButton"
                >
                  {labels.skills.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </KibanaPageTemplate.BottomBar>
        )}
      </KibanaPageTemplate>
    </FormProvider>
  );
};
