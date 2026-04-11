/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiColorPicker,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AgentVisibility,
  VISIBILITY_ICON,
  VISIBILITY_BADGE_COLOR,
  type AgentDefinition,
} from '@kbn/agent-builder-common';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentLabels } from '../../../hooks/agents/use_agent_labels';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { isValidAgentAvatarColor } from '../../../utils/color';
import { truncateAvatarSymbol } from '../edit/agent_form_validation';
import { labels as sharedLabels } from '../../../utils/i18n';
import { FLYOUT_WIDTH } from '../common/constants';

interface EditDetailsFormData {
  name: string;
  description: string;
  avatar_symbol: string;
  avatar_color: string;
  labels: string[];
}

interface EditDetailsFlyoutProps {
  agent: AgentDefinition;
  onClose: () => void;
}

export const EditDetailsFlyout: React.FC<EditDetailsFlyoutProps> = ({ agent, onClose }) => {
  const { agentService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();
  const queryClient = useQueryClient();
  const { labels: existingLabels, isLoading: labelsLoading } = useAgentLabels();

  const { control, handleSubmit, formState } = useForm<EditDetailsFormData>({
    defaultValues: {
      name: agent.name,
      description: agent.description,
      avatar_symbol: agent.avatar_symbol ?? '',
      avatar_color: agent.avatar_color ?? '',
      labels: agent.labels ?? [],
    },
    mode: 'onBlur',
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditDetailsFormData) =>
      agentService.update(agent.id, {
        name: data.name,
        description: data.description,
        avatar_symbol: data.avatar_symbol || undefined,
        avatar_color: data.avatar_color || undefined,
        labels: data.labels,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agent.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.overview.editDetails.successToast', {
          defaultMessage: 'Agent details updated',
        }),
      });
      onClose();
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.overview.editDetails.errorToast', {
          defaultMessage: 'Unable to update agent details',
        }),
      });
    },
  });

  const isShared = (agent.visibility as AgentVisibility) === AgentVisibility.Shared;

  return (
    <EuiFlyout onClose={onClose} size={FLYOUT_WIDTH} data-test-subj="editDetailsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.agentBuilder.overview.editDetails.title', {
              defaultMessage: 'Edit agent details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isShared && (
          <>
            <EuiCallOut
              color="warning"
              size="s"
              title={
                <span>
                  {i18n.translate('xpack.agentBuilder.overview.editDetails.sharedWarningPrefix', {
                    defaultMessage: "You're editing a ",
                  })}
                  <EuiBadge
                    iconType={VISIBILITY_ICON[AgentVisibility.Shared]}
                    color={VISIBILITY_BADGE_COLOR[AgentVisibility.Shared]}
                  >
                    {i18n.translate('xpack.agentBuilder.overview.editDetails.sharedWarningBadge', {
                      defaultMessage: 'Shared agent',
                    })}
                  </EuiBadge>
                  {i18n.translate('xpack.agentBuilder.overview.editDetails.sharedWarningSuffix', {
                    defaultMessage: '. Changes will affect all users.',
                  })}
                </span>
              }
              data-test-subj="editDetailsSharedWarning"
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.agentBuilder.overview.editDetails.identificationTitle', {
              defaultMessage: 'Identification',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.agentBuilder.overview.editDetails.identificationDescription', {
            defaultMessage: 'Define how this agent is named and described.',
          })}
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.overview.editDetails.nameLabel', {
            defaultMessage: 'Agent name',
          })}
          isInvalid={!!formState.errors.name}
          error={formState.errors.name?.message}
          fullWidth
        >
          <Controller
            name="name"
            control={control}
            rules={{
              required: i18n.translate('xpack.agentBuilder.overview.editDetails.nameRequired', {
                defaultMessage: 'Agent name is required.',
              }),
            }}
            render={({ field: { ref, ...rest } }) => (
              <EuiFieldText
                {...rest}
                inputRef={ref}
                isInvalid={!!formState.errors.name}
                data-test-subj="editDetailsNameInput"
                fullWidth
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.overview.editDetails.descriptionLabel', {
            defaultMessage: 'Description',
          })}
          isInvalid={!!formState.errors.description}
          error={formState.errors.description?.message}
          fullWidth
        >
          <Controller
            name="description"
            control={control}
            rules={{
              required: i18n.translate(
                'xpack.agentBuilder.overview.editDetails.descriptionRequired',
                { defaultMessage: 'Description is required.' }
              ),
            }}
            render={({ field: { ref, ...rest } }) => (
              <EuiTextArea
                {...rest}
                inputRef={ref}
                rows={3}
                isInvalid={!!formState.errors.description}
                data-test-subj="editDetailsDescriptionInput"
                fullWidth
              />
            )}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.agentBuilder.overview.editDetails.avatarSymbolLabel', {
                defaultMessage: 'Avatar symbol',
              })}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {sharedLabels.common.optional}
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
                    onChange={(e) => rest.onChange(truncateAvatarSymbol(e.target.value))}
                    inputRef={ref}
                    placeholder={i18n.translate(
                      'xpack.agentBuilder.overview.editDetails.avatarSymbolPlaceholder',
                      { defaultMessage: 'Paste an emoji or use a two letter abbreviation' }
                    )}
                    data-test-subj="editDetailsAvatarSymbolInput"
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.agentBuilder.overview.editDetails.avatarColorLabel', {
                defaultMessage: 'Avatar color',
              })}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {sharedLabels.common.optional}
                </EuiText>
              }
              isInvalid={!!formState.errors.avatar_color}
              error={formState.errors.avatar_color?.message}
            >
              <Controller
                name="avatar_color"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value) return true;
                    return (
                      isValidAgentAvatarColor(value) ||
                      i18n.translate('xpack.agentBuilder.overview.editDetails.avatarColorInvalid', {
                        defaultMessage: 'Enter a color hex code',
                      })
                    );
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <EuiColorPicker
                    onChange={onChange}
                    color={value}
                    placeholder={i18n.translate(
                      'xpack.agentBuilder.overview.editDetails.avatarColorPlaceholder',
                      { defaultMessage: 'Enter a color hex code' }
                    )}
                    data-test-subj="editDetailsAvatarColorPicker"
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.agentBuilder.overview.editDetails.tagsTitle', {
              defaultMessage: 'Tags',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.agentBuilder.overview.editDetails.tagsDescription', {
            defaultMessage: 'Add labels to organize and quickly find this agent.',
          })}
        </EuiText>
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.overview.editDetails.tagsLabel', {
            defaultMessage: 'Enter a tag',
          })}
          fullWidth
        >
          <Controller
            name="labels"
            control={control}
            render={({ field }) => (
              <EuiComboBox
                fullWidth
                selectedOptions={(field.value || []).map((l: string) => ({ label: l }))}
                options={existingLabels.map((label) => ({ label }))}
                onCreateOption={(searchValue: string) => {
                  const newLabel = searchValue.trim();
                  if (!newLabel) return;
                  field.onChange(Array.from(new Set([...(field.value || []), newLabel])));
                }}
                onChange={(options) => field.onChange(options.map((o) => o.label))}
                isLoading={labelsLoading}
                isClearable
                data-test-subj="editDetailsTagsComboBox"
              />
            )}
          />
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="editDetailsCancelButton">
              {i18n.translate('xpack.agentBuilder.overview.editDetails.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit((data) => updateMutation.mutate(data))}
              isLoading={updateMutation.isLoading}
              isDisabled={!formState.isDirty}
              data-test-subj="editDetailsSaveButton"
            >
              {i18n.translate('xpack.agentBuilder.overview.editDetails.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
