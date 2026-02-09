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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTextArea,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import { validateSkillId } from '@kbn/agent-builder-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateSkillPayload, UpdateSkillPayload } from '../../../../common/http_api/skills';
import { useTools } from '../../hooks/tools/use_tools';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';

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

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const [idError, setIdError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [contentError, setContentError] = useState<string | undefined>();

  // Populate form when editing
  useEffect(() => {
    if (skill) {
      setId(skill.id);
      setName(skill.name);
      setDescription(skill.description);
      setContent(skill.content);
      setSelectedToolIds(skill.tool_ids ?? []);
    }
  }, [skill]);

  const toolOptions = useMemo(
    () =>
      tools.map((tool) => ({
        label: tool.id,
        value: tool.id,
      })),
    [tools]
  );

  const selectedToolOptions = useMemo(
    () =>
      selectedToolIds.map((toolId) => ({
        label: toolId,
        value: toolId,
      })),
    [selectedToolIds]
  );

  const isViewMode = mode === SkillFormMode.View;
  const isCreateMode = mode === SkillFormMode.Create;

  const validate = useCallback(() => {
    let valid = true;

    if (isCreateMode) {
      const idErr = validateSkillId(id);
      if (!id.trim()) {
        setIdError('ID is required');
        valid = false;
      } else if (idErr) {
        setIdError(idErr);
        valid = false;
      } else {
        setIdError(undefined);
      }
    }

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError(undefined);
    }

    if (!description.trim()) {
      setDescriptionError('Description is required');
      valid = false;
    } else {
      setDescriptionError(undefined);
    }

    if (!content.trim()) {
      setContentError('Instructions content is required');
      valid = false;
    } else {
      setContentError(undefined);
    }

    return valid;
  }, [id, name, description, content, isCreateMode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onSave || !validate()) return;

      if (mode === SkillFormMode.Create) {
        await onSave({
          id,
          name,
          description,
          content,
          tool_ids: selectedToolIds,
        });
      } else {
        await (onSave as (data: UpdateSkillPayload) => Promise<unknown>)({
          name,
          description,
          content,
          tool_ids: selectedToolIds,
        });
      }
      navigateToAgentBuilderUrl(appPaths.skills.list);
    },
    [
      onSave,
      validate,
      mode,
      id,
      name,
      description,
      content,
      selectedToolIds,
      navigateToAgentBuilderUrl,
    ]
  );

  const handleCancel = useCallback(() => {
    navigateToAgentBuilderUrl(appPaths.skills.list);
  }, [navigateToAgentBuilderUrl]);

  const hasErrors = !!(idError || nameError || descriptionError || contentError);

  const pageTitle = useMemo(() => {
    if (mode === SkillFormMode.Create) return labels.skills.newSkillTitle;
    if (mode === SkillFormMode.Edit) return skill?.id ?? labels.skills.editSkillTitle;
    return skill?.id ?? '';
  }, [mode, skill]);

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderSkillFormPage">
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
        rightSideItems={
          isViewMode
            ? []
            : [
                <EuiToolTip
                  content={hasErrors ? labels.skills.saveButtonTooltip : undefined}
                  display="block"
                >
                  <EuiButton
                    fill
                    iconType="save"
                    onClick={handleSubmit as unknown as () => void}
                    disabled={hasErrors || isSubmitting}
                    isLoading={isSubmitting}
                    data-test-subj="agentBuilderSkillFormSaveButton"
                  >
                    {labels.skills.saveButtonLabel}
                  </EuiButton>
                </EuiToolTip>,
              ]
        }
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
          <EuiForm
            component="form"
            onSubmit={handleSubmit}
            data-test-subj="agentBuilderSkillForm"
            css={css`
              max-width: 640px;
            `}
          >
            {isCreateMode && (
              <EuiFormRow
                label={labels.skills.skillIdLabel}
                isInvalid={!!idError}
                error={idError}
                fullWidth
              >
                <EuiFieldText
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  isInvalid={!!idError}
                  disabled={isViewMode}
                  fullWidth
                  data-test-subj="agentBuilderSkillFormIdInput"
                />
              </EuiFormRow>
            )}

            <EuiFormRow
              label={labels.skills.nameLabel}
              isInvalid={!!nameError}
              error={nameError}
              fullWidth
            >
              <EuiFieldText
                value={name}
                onChange={(e) => setName(e.target.value)}
                isInvalid={!!nameError}
                disabled={isViewMode}
                fullWidth
                data-test-subj="agentBuilderSkillFormNameInput"
              />
            </EuiFormRow>

            <EuiFormRow
              label={labels.skills.descriptionLabel}
              isInvalid={!!descriptionError}
              error={descriptionError}
              fullWidth
            >
              <EuiTextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                isInvalid={!!descriptionError}
                disabled={isViewMode}
                fullWidth
                rows={3}
                data-test-subj="agentBuilderSkillFormDescriptionInput"
              />
            </EuiFormRow>

            <EuiFormRow
              label={labels.skills.contentLabel}
              isInvalid={!!contentError}
              error={contentError}
              fullWidth
              helpText="Markdown instructions that define what this skill does and how agents should use it."
            >
              <EuiTextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                isInvalid={!!contentError}
                disabled={isViewMode}
                fullWidth
                rows={12}
                data-test-subj="agentBuilderSkillFormContentInput"
              />
            </EuiFormRow>

            <EuiFormRow
              label={labels.skills.toolIdsLabel}
              helpText={labels.skills.toolIdsHelpText}
              fullWidth
            >
              <EuiComboBox
                options={toolOptions}
                selectedOptions={selectedToolOptions}
                onChange={(selected) =>
                  setSelectedToolIds(selected.map((opt) => opt.value as string))
                }
                isDisabled={isViewMode}
                fullWidth
                data-test-subj="agentBuilderSkillFormToolIdsInput"
              />
            </EuiFormRow>

            {!isViewMode && (
              <>
                <EuiSpacer size="xl" />
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={handleCancel}
                      data-test-subj="agentBuilderSkillFormCancelButton"
                    >
                      {labels.skills.cancelButtonLabel}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      type="submit"
                      fill
                      iconType="save"
                      disabled={hasErrors || isSubmitting}
                      isLoading={isSubmitting}
                      data-test-subj="agentBuilderSkillFormSubmitButton"
                    >
                      {labels.skills.saveButtonLabel}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiForm>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
