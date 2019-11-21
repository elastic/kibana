/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

export const HelpMenu = pure<{}>(() => {
  useEffect(() => {
    chrome.helpExtension.set({
      appName: i18n.translate('xpack.siem.chrome.help.appName', {
        defaultMessage: 'SIEM',
      }),
      links: [
        {
          linkType: 'discuss',
          href: 'https://discuss.elastic.co/c/siem',
        },
      ],
    });
  }, []);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
