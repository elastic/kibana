/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type ComponentProps } from 'react';
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
} from '@elastic/eui';
import { FormikProvider, useFormik, useFormikContext } from 'formik';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
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
  const { values, setFieldValue } = useFormikContext<SpacesConfigurationFormValues>();

  const onChange = useCallback<ComponentProps<typeof EuiSwitch>['onChange']>(
    async (e) => {
      setFieldValue('rememberSelectedSpace', e.target.checked);
    },
    [setFieldValue]
  );

  return (
    <EuiDescribedFormGroup
      title={
        <h2>
          {i18n.translate('xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.title', {
            defaultMessage: 'Remember last selected space',
          })}
        </h2>
      }
      description={i18n.translate(
        'xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.description',
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
          <EuiSwitch
            css={styles.switch}
            label={null}
            showLabel={false}
            checked={values.rememberSelectedSpace ?? false}
            onChange={onChange}
            compressed
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

  const formik = useFormik<SpacesConfigurationFormValues>({
    initialValues: {
      rememberSelectedSpace: get(userProfile, 'userSettings.rememberSelectedSpace', false),
    },
    onSubmit: async (values) => {
      await updateUserProfile({
        userSettings: {
          rememberSelectedSpace: values.rememberSelectedSpace,
        },
      });
      closeModal();
    },
  });

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="m" id={modalTitleId}>
          {i18n.translate('xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.title', {
            defaultMessage: 'Spaces Configuration',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FormikProvider value={formik}>
          <RememberLastSelectedSpaceConfigEditor />
        </FormikProvider>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="spacesConfigurationModalDiscardButton"
          onClick={() => closeModal()}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.closeButton', {
            defaultMessage: 'Discard',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="spacesConfigurationModalSaveButton"
          isLoading={formik.isSubmitting}
          onClick={formik.submitForm}
          isDisabled={!formik.touched || !formik.dirty}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.spacesConfigurationModal.closeButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
