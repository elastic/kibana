/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { Meta, StoryFn } from '@storybook/react';
import { Form, Formik, type FormikProps } from 'formik';
import React from 'react';

import { SUPPORTED_LOCALE_IDS } from '@kbn/i18n';
import { FormChangesProvider, useFormChanges } from '@kbn/security-form-components';
import type { LocaleValue } from '@kbn/user-profile-components';

import { UserLocaleEditor, type UserProfileFormValues } from './user_profile';

interface LocaleEditorArgs {
  /**
   * The locale value in Formik state. In the real app this is derived by
   * `useUserProfileForm` from the user's saved profile, falling back to the
   * server-configured locale via `toCanonicalLocaleId(i18n.getLocale())` when
   * no preference is saved. By the time the component renders, this is always
   * a concrete supported locale id.
   */
  storedLocale: LocaleValue;
}

export default {
  title: 'Security/Account Management/User Locale Editor',
  component: UserLocaleEditor,
  parameters: {
    docs: {
      description: {
        component:
          'The locale selector in the User Profile page. The form is initialized ' +
          "with the user's saved profile locale, or — when no preference exists — " +
          'with the server-configured locale from `kibana.yml`.',
      },
    },
  },
  argTypes: {
    storedLocale: {
      description: 'The locale value in Formik state (i.e., what `useUserProfileForm` produces).',
      control: { type: 'select' },
      options: SUPPORTED_LOCALE_IDS,
    },
  },
} as Meta<LocaleEditorArgs>;

/** Mirrors the initial values shape that `useUserProfileForm` produces. */
const makeInitialValues = (storedLocale: LocaleValue): UserProfileFormValues => ({
  user: { full_name: 'Example User', email: 'user@example.com' },
  data: {
    avatar: { initials: 'EU', color: '#A6EDEA', imageUrl: '' },
    userSettings: {
      darkMode: 'system',
      contrastMode: 'system',
      locale: storedLocale,
    },
  },
  avatarType: 'initials',
});

const mockSubmitHandlerAction = action('Form submitted with values');

const LocaleEditorHarness: React.FC<LocaleEditorArgs> = ({ storedLocale }) => {
  const formChanges = useFormChanges();
  return (
    <Formik<UserProfileFormValues>
      enableReinitialize
      initialValues={makeInitialValues(storedLocale)}
      onSubmit={(values) => {
        mockSubmitHandlerAction(values);
      }}
    >
      {(formik: FormikProps<UserProfileFormValues>) => (
        <FormChangesProvider value={formChanges}>
          <Form>
            <UserLocaleEditor
              formik={formik as unknown as Parameters<typeof UserLocaleEditor>[0]['formik']}
            />
          </Form>
        </FormChangesProvider>
      )}
    </Formik>
  );
};

const Template: StoryFn<LocaleEditorArgs> = (args) => <LocaleEditorHarness {...args} />;

/**
 * English is pre-selected. This is the state either:
 *   - for a user with `locale: "en"` saved in their profile, or
 *   - for a user with no saved preference on a default (`i18n.locale: en`) deployment,
 *     where `useUserProfileForm` falls back to the loaded locale.
 */
export const English = Template.bind({});
English.args = {
  storedLocale: 'en',
};
