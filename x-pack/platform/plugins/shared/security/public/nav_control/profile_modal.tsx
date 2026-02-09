/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiColorPicker,
  EuiDescribedFormGroup,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Form, FormikProvider } from 'formik';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ContrastKeyPadMenu,
  FormChangesProvider,
  FormField,
  FormLabel,
  FormRow,
  OptionalText,
  ThemeKeyPadMenu,
  useFormChanges,
} from '@kbn/security-form-components';
import { UserAvatar } from '@kbn/user-profile-components';
import type { UserProfileData } from '../../common';
import { IMAGE_FILE_TYPES } from '../../common/constants';
import { canUserChangeDetails, canUserChangePassword, getUserAvatarInitials, getUserAvatarColor } from '../../common/model';
import type { AuthenticatedUser } from '../../../common';
import { ChangePasswordModal } from '../management/users/edit_user/change_password_modal';
import { useUserProfileForm } from '../account_management/user_profile/user_profile';
import { createImageHandler, getRandomColor, VALID_HEX_COLOR } from '../account_management/user_profile/utils';
import { isUserReserved } from '../management/users/user_utils';
import { version$ } from './version_context';
import { useObservable as useKbnObservable } from '@kbn/use-observable';

interface ProfileModalProps {
  user: AuthenticatedUser;
  userProfileData?: UserProfileData;
  onClose: () => void;
}

export const ProfileModal: FunctionComponent<ProfileModalProps> = ({
  user,
  userProfileData,
  onClose,
}) => {
  const { services } = useKibana<CoreStart>();
  
  if (!user) {
    return null;
  }
  
  const formik = useUserProfileForm({ user, data: userProfileData });
  const formChanges = useFormChanges();
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const titleId = `profile-modal-${user.username}`;
  const { euiTheme } = useEuiTheme();
  const previousChangesCount = React.useRef(formChanges.count);
  const previousSubmitCount = React.useRef(formik.submitCount);
  const version = useKbnObservable(version$, 'current');

  // Close modal after successful save
  React.useEffect(() => {
    // When formChanges.count becomes 0 after a submit, it means changes were saved successfully
    if (
      previousChangesCount.current > 0 &&
      formChanges.count === 0 &&
      formik.submitCount > previousSubmitCount.current &&
      !formik.isSubmitting &&
      Object.keys(formik.errors).length === 0
    ) {
      onClose();
    }
    previousChangesCount.current = formChanges.count;
    previousSubmitCount.current = formik.submitCount;
  }, [formChanges.count, formik.submitCount, formik.isSubmitting, formik.errors, onClose]);

  const handleApply = React.useCallback(async () => {
    if (formChanges.count === 0) {
      return;
    }
    
    // Validate first
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      // Show validation errors
      formik.setTouched(
        Object.keys(errors).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as Record<string, boolean>)
      );
      return;
    }
    
    // Submit the form
    await formik.submitForm();
    
    // Close modal after successful save
    // Wait a moment for formChanges to update, then close
    setTimeout(() => {
      onClose();
    }, 200);
  }, [formik, formChanges.count, onClose]);

  // Get default values (as if opening deployment for first time)
  const getDefaultValues = React.useCallback(() => {
    return {
      user: {
        full_name: user.full_name || '',
        email: user.email || '',
      },
      data: formik.values.data ? {
        avatar: {
          initials: getUserAvatarInitials(user),
          color: getUserAvatarColor(user),
          imageUrl: '',
        },
        userSettings: {
          darkMode: 'space_default' as const,
          contrastMode: 'system' as const,
        },
      } : undefined,
      avatarType: 'initials' as const,
    };
  }, [formik.values.data, user]);

  // Check if current state matches default state
  const isDefaultState = React.useMemo(() => {
    const defaultValues = getDefaultValues();
    const currentValues = formik.values;

    // Check user details
    if (
      currentValues.user.full_name !== defaultValues.user.full_name ||
      currentValues.user.email !== defaultValues.user.email
    ) {
      return false;
    }

    // Check avatar type
    if (currentValues.avatarType !== defaultValues.avatarType) {
      return false;
    }

    // Check data if it exists
    if (currentValues.data && defaultValues.data) {
      // Check avatar
      if (
        currentValues.data.avatar.initials !== defaultValues.data.avatar.initials ||
        currentValues.data.avatar.color !== defaultValues.data.avatar.color ||
        currentValues.data.avatar.imageUrl !== defaultValues.data.avatar.imageUrl
      ) {
        return false;
      }

      // Check user settings
      if (
        currentValues.data.userSettings.darkMode !== defaultValues.data.userSettings.darkMode ||
        currentValues.data.userSettings.contrastMode !== defaultValues.data.userSettings.contrastMode
      ) {
        return false;
      }
    } else if (currentValues.data !== defaultValues.data) {
      // One has data and the other doesn't
      return false;
    }

    return true;
  }, [formik.values, getDefaultValues]);

  // Handle reset - reset to default settings (as if opening deployment for first time)
  const handleReset = React.useCallback(() => {
    const defaultValues = getDefaultValues();
    
    // Reset formik values
    formik.setValues(defaultValues);
    formik.setTouched({});
  }, [formik, getDefaultValues]);

  const isCloudUser = user.elastic_cloud_user;
  const isThemeOverridden = services.settings.client.isOverridden('theme:darkMode');
  const isOverriddenThemeDarkMode = services.theme.getTheme().darkMode;
  const isReservedUser = isUserReserved(user);

  const canChangeDetails = canUserChangeDetails(user, services.application.capabilities);
  const canChangePassword = canUserChangePassword(user);

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={800}
      style={{ width: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      outsideClickCloses={true}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          <EuiText>
            <strong>{user.username}</strong>
            {user.full_name && <EuiText component="span"> - {user.full_name}</EuiText>}
          </EuiText>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        <FormikProvider value={formik}>
          <FormChangesProvider value={formChanges}>
            {showChangePasswordForm ? (
              <ChangePasswordModal
                username={user.username}
                onCancel={() => setShowChangePasswordForm(false)}
                onSuccess={() => setShowChangePasswordForm(false)}
              />
            ) : null}

            <Form aria-labelledby={titleId}>
              {canChangeDetails && (
                <>
                  <EuiDescribedFormGroup
                    fullWidth
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.security.accountManagement.userProfile.detailsGroupTitle"
                          defaultMessage="Details"
                        />
                      </h2>
                    }
                    description={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.detailsGroupDescription"
                        defaultMessage="Provide some basic information about yourself."
                      />
                    }
                  >
                    <FormRow
                      label={
                        <FormLabel for="user.full_name">
                          <EuiFlexGroup justifyContent="spaceBetween">
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.fullNameLabel"
                              defaultMessage="Full name"
                            />
                            <OptionalText />
                          </EuiFlexGroup>
                        </FormLabel>
                      }
                      fullWidth
                    >
                      <FormField name="user.full_name" data-test-subj={'userProfileFullName'} fullWidth />
                    </FormRow>

                    <FormRow
                      label={
                        <FormLabel for="user.email">
                          <EuiFlexGroup justifyContent="spaceBetween">
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.emailLabel"
                              defaultMessage="Email address"
                            />
                            <OptionalText />
                          </EuiFlexGroup>
                        </FormLabel>
                      }
                      fullWidth
                    >
                      <FormField type="email" name="user.email" data-test-subj={'userProfileEmail'} fullWidth />
                    </FormRow>
                  </EuiDescribedFormGroup>
                  <EuiSpacer size="l" />
                </>
              )}

              {!isCloudUser && formik.values.data && (
                <>
                  <EuiDescribedFormGroup
                    fullWidth
                    fieldFlexItemProps={{ style: { alignSelf: 'flex-start' } }}
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.security.accountManagement.userProfile.avatarGroupTitle"
                          defaultMessage="Avatar"
                        />
                      </h2>
                    }
                    description={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.avatarGroupDescription"
                        defaultMessage="Provide your initials or upload an image to represent yourself."
                      />
                    }
                  >
                    <EuiFlexGroup responsive={false}>
                      <EuiFlexItem grow={false}>
                        {formik.values.avatarType === 'image' && !formik.values.data.avatar.imageUrl ? (
                          <UserAvatar size="xl" />
                        ) : (
                          <UserAvatar
                            user={{
                              username: user.username,
                              full_name: formik.values.user.full_name,
                            }}
                            avatar={{
                              imageUrl:
                                formik.values.avatarType === 'image'
                                  ? formik.values.data.avatar.imageUrl
                                  : undefined,
                              initials: formik.values.data.avatar.initials || '?',
                              color: VALID_HEX_COLOR.test(formik.values.data.avatar.color)
                                ? formik.values.data.avatar.color
                                : undefined,
                            }}
                            size="xl"
                          />
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <FormRow
                          name="avatarType"
                          label={
                            <FormLabel for="avatarType">
                              <FormattedMessage
                                id="xpack.security.accountManagement.userProfile.avatarTypeGroupDescription"
                                defaultMessage="Avatar type"
                              />
                            </FormLabel>
                          }
                          fullWidth
                        >
                          <EuiButtonGroup
                            legend={i18n.translate(
                              'xpack.security.accountManagement.userProfile.avatarTypeGroupDescription',
                              { defaultMessage: 'Avatar type' }
                            )}
                            buttonSize="m"
                            idSelected={formik.values.avatarType}
                            options={[
                              {
                                id: 'initials',
                                label: (
                                  <FormattedMessage
                                    id="xpack.security.accountManagement.userProfile.initialsAvatarTypeLabel"
                                    defaultMessage="Initials"
                                  />
                                ),
                              },
                              {
                                id: 'image',
                                label: (
                                  <FormattedMessage
                                    id="xpack.security.accountManagement.userProfile.imageAvatarTypeLabel"
                                    defaultMessage="Image"
                                  />
                                ),
                                iconType: 'image',
                              },
                            ]}
                            onChange={(id: string) => formik.setFieldValue('avatarType', id)}
                            isFullWidth
                          />
                        </FormRow>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer />

                    {formik.values.avatarType === 'image' ? (
                      <FormRow
                        label={
                          <FormLabel for="data.avatar.imageUrl">
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.imageUrlLabel"
                              defaultMessage="Image"
                            />
                          </FormLabel>
                        }
                        fullWidth
                      >
                        <FormField
                          as={EuiFilePicker}
                          name="data.avatar.imageUrl"
                          value={undefined}
                          initialPromptText={
                            formik.values.data.avatar.imageUrl ? (
                              <FormattedMessage
                                id="xpack.security.accountManagement.userProfile.prepopulatedImageUrlPromptText"
                                defaultMessage="Select or drag and drop a replacement image"
                              />
                            ) : (
                              <FormattedMessage
                                id="xpack.security.accountManagement.userProfile.imageUrlPromptText"
                                defaultMessage="Select or drag and drop an image"
                              />
                            )
                          }
                          onChange={createImageHandler((imageUrl) => {
                            if (!imageUrl) {
                              formik.setFieldError(
                                'data.avatar.imageUrl',
                                i18n.translate(
                                  'xpack.security.accountManagement.userProfile.imageUrlRequiredError',
                                  { defaultMessage: 'Upload an image.' }
                                )
                              );
                              formik.setFieldTouched('data.avatar.imageUrl', true);
                            } else {
                              formik.setFieldValue('data.avatar.imageUrl', imageUrl ?? '');
                            }
                          })}
                          validate={{
                            required: i18n.translate(
                              'xpack.security.accountManagement.userProfile.imageUrlRequiredError',
                              { defaultMessage: 'Upload an image.' }
                            ),
                          }}
                          accept={IMAGE_FILE_TYPES.join(',')}
                          display="default"
                          fullWidth
                        />
                      </FormRow>
                    ) : (
                      <EuiFlexGroup responsive={false}>
                        <EuiFlexItem grow={false} css={css({ width: 64 })}>
                          <FormRow
                            label={
                              <FormLabel for="data.avatar.initials">
                                <FormattedMessage
                                  id="xpack.security.accountManagement.userProfile.initialsLabel"
                                  defaultMessage="Initials"
                                />
                              </FormLabel>
                            }
                            fullWidth
                          >
                            <FormField
                              name="data.avatar.initials"
                              maxLength={2}
                              validate={{
                                required: i18n.translate(
                                  'xpack.security.accountManagement.userProfile.initialsRequiredError',
                                  { defaultMessage: 'Add initials' }
                                ),
                                maxLength: {
                                  value: 2,
                                  message: i18n.translate(
                                    'xpack.security.accountManagement.userProfile.initialsMaxLengthError',
                                    { defaultMessage: 'Enter no more than 2 characters.' }
                                  ),
                                },
                              }}
                              fullWidth
                            />
                          </FormRow>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <FormRow
                            label={
                              <FormLabel for="data.avatar.color">
                                <FormattedMessage
                                  id="xpack.security.accountManagement.userProfile.colorLabel"
                                  defaultMessage="Color"
                                />
                              </FormLabel>
                            }
                            labelAppend={
                              !isReservedUser ? (
                                <EuiButtonEmpty
                                  onClick={() => formik.setFieldValue('data.avatar.color', getRandomColor())}
                                  size="xs"
                                  flush="right"
                                  css={css({ height: euiTheme.base })}
                                >
                                  <FormattedMessage
                                    id="xpack.security.accountManagement.userProfile.randomizeButton"
                                    defaultMessage="Randomize"
                                  />
                                </EuiButtonEmpty>
                              ) : null
                            }
                            fullWidth
                          >
                            <FormField
                              as={EuiColorPicker}
                              name="data.avatar.color"
                              color={formik.values.data.avatar.color}
                              validate={{
                                required: i18n.translate(
                                  'xpack.security.accountManagement.userProfile.colorRequiredError',
                                  { defaultMessage: 'Select a color.' }
                                ),
                                pattern: {
                                  value: VALID_HEX_COLOR,
                                  message: i18n.translate(
                                    'xpack.security.accountManagement.userProfile.colorPatternError',
                                    { defaultMessage: 'Enter a valid HEX color code.' }
                                  ),
                                },
                              }}
                              onChange={(value: string) => {
                                formik.setFieldValue('data.avatar.color', value);
                              }}
                              fullWidth
                            />
                          </FormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    )}
                  </EuiDescribedFormGroup>
                  <EuiSpacer size="l" />
                </>
              )}

              {canChangePassword && (
                <>
                  <EuiDescribedFormGroup
                    fullWidth
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.security.accountManagement.userProfile.passwordGroupTitle"
                          defaultMessage="Password"
                        />
                      </h2>
                    }
                    description={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.passwordGroupDescription"
                        defaultMessage="Protect your data with a strong password."
                      />
                    }
                  >
                    <EuiButton onClick={() => setShowChangePasswordForm(true)} iconType="lock">
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.changePasswordButton"
                        defaultMessage="Change password"
                      />
                    </EuiButton>
                  </EuiDescribedFormGroup>
                  <EuiSpacer size="l" />
                </>
              )}

              {!isCloudUser && formik.values.data && version !== '1.2' && (
                <>
                  <EuiDescribedFormGroup
                    fullWidth
                    fieldFlexItemProps={{ style: { alignSelf: 'flex-start' } }}
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.security.accountManagement.userProfile.userSettingsTitle"
                          defaultMessage="Appearance"
                        />
                      </h2>
                    }
                    description={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.themeFormGroupDescription"
                        defaultMessage="Select the appearance of your interface."
                      />
                    }
                  >
                    <FormRow name="data.userSettings.darkMode" fullWidth>
                      <>
                        <ThemeKeyPadMenu
                          name="data.userSettings.darkMode"
                          isDisabled={isThemeOverridden}
                          isThemeOverridden={isThemeOverridden}
                        />
                        {(() => {
                          let colorModeIdSelected = formik.values.data.userSettings.darkMode;
                          if (isThemeOverridden) {
                            colorModeIdSelected = isOverriddenThemeDarkMode ? 'dark' : 'light';
                          }
                          return colorModeIdSelected === 'space_default' ? (
                            <>
                              <EuiSpacer size="s" />
                              <EuiCallOut
                                announceOnMount
                                title={i18n.translate(
                                  'xpack.security.accountManagement.userProfile.deprecatedSpaceDefaultTitle',
                                  {
                                    defaultMessage: 'Space default settings will be removed in a future version',
                                  }
                                )}
                                color="warning"
                                iconType="warning"
                              >
                                <p>
                                  {i18n.translate(
                                    'xpack.security.accountManagement.userProfile.deprecatedSpaceDefaultDescription',
                                    {
                                      defaultMessage:
                                        'All users with the Space default color mode enabled will be automatically transitioned to the System color mode.',
                                    }
                                  )}
                                </p>
                              </EuiCallOut>
                            </>
                          ) : null;
                        })()}
                      </>
                    </FormRow>

                    <FormRow name="data.userSettings.contrastMode" fullWidth>
                      <ContrastKeyPadMenu name="data.userSettings.contrastMode" />
                    </FormRow>
                  </EuiDescribedFormGroup>
                  <EuiSpacer size="l" />
                </>
              )}

            </Form>
          </FormChangesProvider>
        </FormikProvider>
      </EuiModalBody>
      {/* Fixed footer with save/discard buttons */}
      <div
        css={css`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: ${euiTheme.size.m};
          background: ${euiTheme.colors.emptyShade};
          border-top: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty 
              onClick={handleReset} 
              color="danger"
              iconType="refresh"
              disabled={isDefaultState}
            >
              <FormattedMessage
                id="xpack.security.accountManagement.userProfile.resetButton"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
              {formChanges.count > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty 
                    onClick={formik.handleReset} 
                    color="text"
                  >
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.discardChangesButton"
                      defaultMessage="Discard"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleApply}
                  fill
                  disabled={formChanges.count === 0}
                >
                  <FormattedMessage
                    id="xpack.security.accountManagement.userProfile.applyChangesButton"
                    defaultMessage="Apply"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiModal>
  );
};
