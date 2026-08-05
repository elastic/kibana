/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiButtonEmpty,
  EuiButton,
  EuiDescribedFormGroup,
  useEuiTheme,
  EuiForm,
} from '@elastic/eui';
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
  type SubmitHandler,
} from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { UserProfileData, UserSettingsData } from '@kbn/user-profile-components';
import { rememberLastSelectedSpaceConfigEditorStyles } from './spaces_configuration_modal.styles';

type SpacesConfigurationFormValues = Pick<UserSettingsData, 'rememberSelectedSpace'>;

interface SpacesConfigurationModalProps {
  closeModal: () => void;
  userProfile: UserProfileData;
  updateUserProfile: (userProfile: UserProfileData) => Promise<UserProfileData>;
}

function RememberLastSelectedSpaceConfigEditor() {
  const { euiTheme } = useEuiTheme();
  const styles = rememberLastSelectedSpaceConfigEditorStyles(euiTheme);
  const { control } = useFormContext<SpacesConfigurationFormValues>();
  const rememberLastSpaceId = useGeneratedHtmlId();

  return (
    <EuiDescribedFormGroup
      title={
        <h2 id={rememberLastSpaceId}>
          {i18n.translate(
            'xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.rememberLastSelectedSpace.title',
            {
              defaultMessage: 'Remember last selected space',
            }
          )}
        </h2>
      }
      description={i18n.translate(
        'xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.rememberLastSelectedSpace.description',
        {
          defaultMessage: 'Kibana will redirect to last accessed space on login.',
        }
      )}
      css={styles.formGroup}
      fieldFlexItemProps={{ grow: false }}
      fullWidth
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem>
          <Controller
            name="rememberSelectedSpace"
            control={control}
            render={({ field: { value, onChange } }) => (
              <EuiSwitch
                css={styles.switch}
                label={null}
                aria-labelledby={rememberLastSpaceId}
                checked={value ?? false}
                onChange={(e) => onChange(e.target.checked)}
                compressed
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescribedFormGroup>
  );
}

export function SpacesConfigurationModal({
  closeModal,
  userProfile,
  updateUserProfile,
}: SpacesConfigurationModalProps) {
  const modalTitleId = useGeneratedHtmlId();

  const form = useForm<SpacesConfigurationFormValues>({
    defaultValues: {
      rememberSelectedSpace: userProfile?.userSettings?.rememberSelectedSpace ?? false,
    },
  });

  const { handleSubmit, formState } = form;
  const { isDirty, isSubmitting } = formState;

  const onSubmit = useCallback<SubmitHandler<SpacesConfigurationFormValues>>(
    async (values) => {
      await updateUserProfile({
        userSettings: {
          rememberSelectedSpace: values.rememberSelectedSpace ?? false,
        },
      });
      closeModal();
    },
    [closeModal, updateUserProfile]
  );

  return (
    <FormProvider {...form}>
      <EuiForm onSubmit={handleSubmit(onSubmit)}>
        <EuiModal
          data-test-subj="spacesConfigurationModal"
          aria-labelledby={modalTitleId}
          onClose={closeModal}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle size="m" id={modalTitleId}>
              {i18n.translate('xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.title', {
                defaultMessage: 'Spaces Configuration',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <RememberLastSelectedSpaceConfigEditor />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="spacesConfigurationModalDiscardButton"
              onClick={() => closeModal()}
            >
              {i18n.translate(
                'xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.cancelButton',
                {
                  defaultMessage: 'Discard',
                }
              )}
            </EuiButtonEmpty>
            <EuiButton
              fill
              data-test-subj="spacesConfigurationModalSaveButton"
              isLoading={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              isDisabled={!isDirty || isSubmitting}
            >
              {i18n.translate(
                'xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.saveButton',
                {
                  defaultMessage: 'Save',
                }
              )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiForm>
    </FormProvider>
  );
}
