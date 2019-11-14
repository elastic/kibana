/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { Chrome } from 'ui/chrome';

const docsPage = 'lens';

export function addHelpMenuToAppChrome(chrome: Chrome) {
  chrome.helpExtension.set({
    appName: 'Lens',
    links: [
      {
        linkType: 'documentation',
        href: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${docsPage}.html`,
      },
      {
        linkType: 'github',
        title: '[Lens]',
        labels: ['Feature:Lens'],
      },
    ],
  });
}
