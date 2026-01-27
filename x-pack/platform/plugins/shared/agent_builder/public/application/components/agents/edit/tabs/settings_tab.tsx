/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiComboBox,
  EuiColorPicker,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiMarkdownEditor,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Control, FormState } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { labels } from '../../../../utils/i18n';
import { useAgentLabels } from '../../../../hooks/agents/use_agent_labels';
import type { AgentFormData } from '../agent_form';

interface AgentSettingsTabProps {
  control: Control<AgentFormData>;
  formState: FormState<AgentFormData>;
  isCreateMode: boolean;
  isFormDisabled: boolean;
}

export const AgentSettingsTab: React.FC<AgentSettingsTabProps> = ({
  control,
  formState,
  isCreateMode,
  isFormDisabled,
}) => {
  const { labels: existingLabels, isLoading: labelsLoading } = useAgentLabels();

  /* Enable shrinking; default min-width:auto blocks it and causes overflow */
  const formFlexColumnStyles = css`
    min-width: 0;
  `;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="system-references-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="bullseye" />
              <EuiTitle size="xs">
                <h2 id="system-references-section-title">
                  {i18n.translate('xpack.agentBuilder.agents.form.settings.systemReferencesTitle', {
                    defaultMessage: 'System references',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.agentBuilder.agents.form.settings.systemReferencesDescription',
                {
                  defaultMessage:
                    "Used behind the scenes to identify and guide the agent's behavior. Not shown to end users.",
                }
              )}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false} color="subdued">
              <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                <EuiTitle size="xxs">
                  <span>
                    {i18n.translate('xpack.agentBuilder.agents.form.settings.agentIdLabel', {
                      defaultMessage: 'Agent ID',
                    })}
                  </span>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.agentBuilder.agents.form.settings.agentIdDescription', {
                    defaultMessage: 'Unique ID to reference the agent in code or configurations.',
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs">
                  <span>
                    {i18n.translate('xpack.agentBuilder.agents.form.settings.instructionsLabel', {
                      defaultMessage: 'Instructions',
                    })}
                  </span>
                </EuiTitle>

                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.agentBuilder.agents.form.settings.instructionsDescription',
                    {
                      defaultMessage:
                        'Guides how this agent behaves when interacting with tools or responding to queries. Use this to set tone, priorities, or special behaviors.',
                    }
                  )}
                </EuiText>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={2} css={formFlexColumnStyles}>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.agents.form.idLabel', {
              defaultMessage: 'Agent ID',
            })}
            isInvalid={!!formState.errors.id}
            error={formState.errors.id?.message}
          >
            <Controller
              name="id"
              control={control}
              render={({ field: { ref, ...rest } }) => (
                <EuiFieldText
                  {...rest}
                  inputRef={ref}
                  disabled={isFormDisabled || !isCreateMode}
                  placeholder={
                    isCreateMode
                      ? i18n.translate('xpack.agentBuilder.agents.form.idPlaceholder', {
                          defaultMessage: 'Enter agent ID',
                        })
                      : ''
                  }
                  isInvalid={!!formState.errors.id}
                  aria-label={i18n.translate('xpack.agentBuilder.agents.form.idAriaLabel', {
                    defaultMessage: 'Agent ID input field',
                  })}
                  data-test-subj="agentSettingsIdInput"
                />
              )}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.agents.form.customInstructionsLabel', {
              defaultMessage: 'Custom Instructions',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {labels.common.optional}
              </EuiText>
            }
            isInvalid={!!formState.errors.configuration?.instructions}
            error={formState.errors.configuration?.instructions?.message}
          >
            <Controller
              name="configuration.instructions"
              control={control}
              render={({ field: { onChange, value } }) => (
                <EuiMarkdownEditor
                  onChange={onChange}
                  value={value ?? ''}
                  readOnly={isFormDisabled}
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.agents.form.customInstructionsEditorLabel',
                    {
                      defaultMessage: 'Custom Instructions Editor',
                    }
                  )}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="labels-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="tag" />
              <EuiTitle size="xs">
                <h2 id="labels-section-title">
                  {i18n.translate('xpack.agentBuilder.agents.form.settings.labelsTitle', {
                    defaultMessage: 'Labels',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.agentBuilder.agents.form.settings.labelsDescription', {
                defaultMessage: 'Add labels to group, filter, or organize your agents.',
              })}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={formFlexColumnStyles}>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.agentBuilder.agents.form.labelsLabel', {
              defaultMessage: 'Labels',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {labels.common.optional}
              </EuiText>
            }
            isInvalid={!!formState.errors.labels}
            error={formState.errors.labels?.message}
          >
            <Controller
              name="labels"
              control={control}
              render={({ field }) => (
                <EuiComboBox
                  fullWidth
                  placeholder={i18n.translate('xpack.agentBuilder.agents.form.labelsPlaceholder', {
                    defaultMessage: 'Add one or more labels',
                  })}
                  selectedOptions={(field.value || []).map((l: string) => ({ label: l }))}
                  options={existingLabels.map((label) => ({ label }))}
                  onCreateOption={(searchValue: string) => {
                    const newLabel = searchValue.trim();
                    if (!newLabel) return;
                    const next = Array.from(new Set([...(field.value || []), newLabel]));
                    field.onChange(next);
                  }}
                  onChange={(options) => field.onChange(options.map((o) => o.label))}
                  isDisabled={isFormDisabled || labelsLoading}
                  isClearable
                  isLoading={labelsLoading}
                  aria-label={i18n.translate('xpack.agentBuilder.agents.form.labelsAriaLabel', {
                    defaultMessage: 'Agent labels selection',
                  })}
                  data-test-subj="agentSettingsLabelsComboBox"
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="presentation-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="brush" />
              <EuiTitle size="xs">
                <h2 id="presentation-section-title">
                  {i18n.translate('xpack.agentBuilder.agents.form.settings.presentationTitle', {
                    defaultMessage: 'Presentation',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.agentBuilder.agents.form.settings.presentationDescription', {
                defaultMessage:
                  'Set how your agent shows up to users — choose a name, avatar, and a friendly description.',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false} color="subdued">
              <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                <EuiTitle size="xxs">
                  <span>
                    {i18n.translate(
                      'xpack.agentBuilder.agents.form.settings.presentationNameDescriptionLabel',
                      {
                        defaultMessage: 'Display name and description',
                      }
                    )}
                  </span>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.agentBuilder.agents.form.settings.presentationNameDescriptionDescription',
                    {
                      defaultMessage:
                        'The human-friendly name and short, friendly introduction your users see when they search for and interact with this agent.',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiTitle size="xxs">
                  <span>
                    {i18n.translate(
                      'xpack.agentBuilder.agents.form.settings.presentationAvatarLabel',
                      {
                        defaultMessage: 'Avatar color and symbol',
                      }
                    )}
                  </span>
                </EuiTitle>

                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.agentBuilder.agents.form.settings.presentationAvatarDescription',
                    {
                      defaultMessage:
                        "Customize the agent's avatar color and symbol (emoji or 2-letter code) to help visually distinguish and identify it in the UI.",
                    }
                  )}
                </EuiText>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={formFlexColumnStyles}>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.agents.form.nameLabel', {
              defaultMessage: 'Display name',
            })}
            isInvalid={!!formState.errors.name}
            error={formState.errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field: { ref, ...rest } }) => (
                <EuiFieldText
                  {...rest}
                  inputRef={ref}
                  disabled={isFormDisabled}
                  isInvalid={!!formState.errors.name}
                  aria-label={i18n.translate('xpack.agentBuilder.agents.form.nameAriaLabel', {
                    defaultMessage: 'Agent display name input field',
                  })}
                  data-test-subj="agentSettingsDisplayNameInput"
                />
              )}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.agents.form.descriptionLabel', {
              defaultMessage: 'Display description',
            })}
            isInvalid={!!formState.errors.description}
            error={formState.errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field: { ref, ...rest } }) => (
                <EuiTextArea
                  {...rest}
                  inputRef={ref}
                  rows={4}
                  disabled={isFormDisabled}
                  isInvalid={!!formState.errors.configuration?.instructions}
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.agents.form.descriptionAriaLabel',
                    {
                      defaultMessage: 'Agent display description text area',
                    }
                  )}
                  data-test-subj="agentSettingsDescriptionInput"
                />
              )}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFlexGroup direction="row" gutterSize="s" alignItems="flexStart">
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.agents.form.avatarColorLabel', {
                  defaultMessage: 'Avatar color',
                })}
                labelAppend={
                  <EuiText size="xs" color="subdued">
                    {labels.common.optional}
                  </EuiText>
                }
                isInvalid={!!formState.errors.avatar_color}
                error={formState.errors.avatar_color?.message}
              >
                <Controller
                  name="avatar_color"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <EuiColorPicker
                      onChange={onChange}
                      color={value}
                      disabled={isFormDisabled}
                      isInvalid={!!formState.errors.avatar_color}
                      aria-label={i18n.translate(
                        'xpack.agentBuilder.agents.form.avatarColorAriaLabel',
                        {
                          defaultMessage: 'Agent avatar color picker',
                        }
                      )}
                    />
                  )}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.agents.form.avatarSymbolLabel', {
                  defaultMessage: 'Avatar symbol',
                })}
                labelAppend={
                  <EuiText size="xs" color="subdued">
                    {labels.common.optional}
                  </EuiText>
                }
                isInvalid={!!formState.errors.avatar_symbol}
                error={formState.errors.avatar_symbol?.message}
              >
                <Controller
                  name="avatar_symbol"
                  control={control}
                  render={({ field: { ref, ...rest } }) => (
                    <EuiFieldText
                      {...rest}
                      onChange={(event) => {
                        const value = event.target.value;
                        rest.onChange(value.slice(0, 2));
                      }}
                      inputRef={ref}
                      disabled={isFormDisabled}
                      isInvalid={!!formState.errors.avatar_symbol}
                      aria-label={i18n.translate(
                        'xpack.agentBuilder.agents.form.avatarSymbolAriaLabel',
                        {
                          defaultMessage: 'Agent avatar symbol input field',
                        }
                      )}
                    />
                  )}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
