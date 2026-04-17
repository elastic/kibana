/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProfileFormContent } from '../profile_form/profile_form_content';
import { ProfileFormFooter } from '../profile_form/profile_form_footer';
import type { ProfileFormProps } from '../profile_form/profile_form_props';
import { ProfileFormProvider } from '../profile_form/profile_form_provider';

export type ProfileFlyoutProps = ProfileFormProps;

export const ProfileFlyout = (props: ProfileFlyoutProps) => {
  const { isEdit, onCancel } = props;

  return (
    <EuiFlyout
      aria-label={
        isEdit
          ? i18n.translate('anonymizationUi.profiles.flyout.ariaLabel.edit', {
              defaultMessage: 'Edit profile',
            })
          : i18n.translate('anonymizationUi.profiles.flyout.ariaLabel.create', {
              defaultMessage: 'Create profile',
            })
      }
      onClose={onCancel}
      ownFocus
      size="m"
      data-test-subj="anonymizationProfilesProfileFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {isEdit
              ? i18n.translate('anonymizationUi.profiles.flyout.title.edit', {
                  defaultMessage: 'Edit profile',
                })
              : i18n.translate('anonymizationUi.profiles.flyout.title.create', {
                  defaultMessage: 'Create profile',
                })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('anonymizationUi.profiles.flyout.privacyGuidanceDescription', {
              defaultMessage:
                'Define privacy settings for event data sent to third-party LLM providers. Create one profile per target (index, index pattern or data view) per space. Choose which fields to include and which to anonymize by replacing values with mask tokens.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <ProfileFormProvider {...props}>
        <EuiFlyoutBody>
          <ProfileFormContent />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <ProfileFormFooter />
        </EuiFlyoutFooter>
      </ProfileFormProvider>
    </EuiFlyout>
  );
};
