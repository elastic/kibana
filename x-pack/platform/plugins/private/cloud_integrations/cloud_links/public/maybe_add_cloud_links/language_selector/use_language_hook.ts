/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LocaleValue as Locale } from '@kbn/user-profile-components';
import { useUserProfileSetting } from '../use_user_profile_setting';

export const useLanguage = () => {
  return useUserProfileSetting<Locale>({
    settingKey: 'locale',
    defaultValue: '',
    notification: {
      title: i18n.translate('xpack.cloudLinks.userMenuLinks.language.successNotificationTitle', {
        defaultMessage: 'Language settings updated',
      }),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.language.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
  });
};
