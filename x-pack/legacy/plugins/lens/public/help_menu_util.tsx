/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { ChromeStart } from 'kibana/public';

export function addHelpMenuToAppChrome(chrome: ChromeStart) {
  chrome.setHelpExtension({
    appName: 'Lens',
    links: [
      {
        linkType: 'documentation',
        href: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/lens.html`,
      },
      {
        linkType: 'github',
        title: '[Lens]',
        labels: ['Feature:Lens'],
      },
    ],
  });
}
