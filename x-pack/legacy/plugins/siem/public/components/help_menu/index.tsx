/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../lib/kibana';

export const HelpMenu = React.memo(() => {
  const { chrome, docLinks } = useKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: i18n.translate('xpack.siem.chrome.help.appName', {
        defaultMessage: 'SIEM',
      }),
      links: [
        {
          content: i18n.translate('xpack.siem.chrome.helpMenu.documentation', {
            defaultMessage: 'SIEM documentation',
          }),
          href: docLinks.links.siem.guide,
          iconType: 'documents',
          linkType: 'custom',
        },
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
