/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useUserProfileSetting } from '../use_user_profile_setting';

/** Experimental per-user opt-in for the browser translation patch. */
export const useTranslationResilience = () => {
  return useUserProfileSetting<boolean>({
    settingKey: 'installTranslationResilience',
    defaultValue: false,
    notification: {
      title: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.translationResilience.successNotificationTitle',
        {
          defaultMessage: 'Browser translation setting updated',
        }
      ),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.translationResilience.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
  });
};
