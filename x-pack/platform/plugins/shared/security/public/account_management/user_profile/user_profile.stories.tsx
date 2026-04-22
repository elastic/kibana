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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { FormChangesProvider, useFormChanges } from '@kbn/security-form-components';
import type { LocaleValue } from '@kbn/user-profile-components';

import { UserLocaleEditor, type UserProfileFormValues } from './user_profile';

interface LocaleEditorArgs {
  /** The server admin's `i18n.locale` config (from kibana.yml). Drives the "Server default (Label)" parenthetical. */
  configLocale: string;
  /** The locale saved in the user profile. Empty string `""` represents "no explicit choice" and pre-selects "Server default". */
  storedLocale: LocaleValue;
}

export default {
  title: 'Security/Account Management/User Locale Editor',
  component: UserLocaleEditor,
  parameters: {
    docs: {
      description: {
        component:
          'The locale selector in the User Profile page. Includes a “Server default” ' +
          'pseudo-option that falls back to the server’s `i18n.locale` config. The ' +
          'parenthetical label reflects whichever locale the admin has configured.',
      },
    },
  },
  argTypes: {
    configLocale: {
      description: "The server admin's `i18n.locale` config (from kibana.yml).",
      control: { type: 'select' },
      options: SUPPORTED_LOCALE_IDS,
    },
    storedLocale: {
      description:
        'The locale saved in the user profile. `""` = no explicit choice (Server default).',
      control: { type: 'select' },
      options: ['', ...SUPPORTED_LOCALE_IDS],
    },
  },
} as Meta<LocaleEditorArgs>;

/** Minimal stub of `CoreStart` services needed by `UserLocaleEditor` via `useKibana`. */
const makeServices = (configLocale: string) => ({
  i18n: { getConfigLocale: () => configLocale },
});

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

const LocaleEditorHarness: React.FC<LocaleEditorArgs> = ({ configLocale, storedLocale }) => {
  const formChanges = useFormChanges();
  return (
    <KibanaContextProvider services={makeServices(configLocale)}>
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
    </KibanaContextProvider>
  );
};

const Template: StoryFn<LocaleEditorArgs> = (args) => <LocaleEditorHarness {...args} />;

/**
 * New user (no stored locale) on a default deployment. The dropdown pre-selects
 * "Server default (English)" — the user hasn't made an explicit choice.
 */
export const DefaultDeploymentNoUserChoice = Template.bind({});
DefaultDeploymentNoUserChoice.args = {
  configLocale: 'en',
  storedLocale: '',
};

/**
 * New user on a deployment where the admin set `i18n.locale: fr-FR`. The dropdown
 * shows "Server default (Français)" — the user sees French by inheritance,
 * and the label makes it explicit what the fallback resolves to.
 */
export const ServerConfiguredFrenchNoUserChoice = Template.bind({});
ServerConfiguredFrenchNoUserChoice.args = {
  configLocale: 'fr-FR',
  storedLocale: '',
};

/**
 * User has explicitly picked French, overriding whatever the admin configured.
 * The dropdown shows "Français" selected.
 */
export const UserChoseFrench = Template.bind({});
UserChoseFrench.args = {
  configLocale: 'en',
  storedLocale: 'fr-FR',
};

/**
 * User has explicitly picked Japanese on a server configured for French.
 * Shows that user profile overrides the server config.
 */
export const UserOverridesServerConfig = Template.bind({});
UserOverridesServerConfig.args = {
  configLocale: 'fr-FR',
  storedLocale: 'ja-JP',
};
