/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import 'react-vis/dist/style.css';
import 'ui/autoload/all';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

import url from 'url';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { plugin } from './new-platform';
import { REACT_APP_ROOT_ID } from './new-platform/plugin';
import './style/global_overrides.css';
import template from './templates/index.html';

const { core } = npStart;

// render APM feedback link in global help menu
core.chrome.setHelpExtension({
  appName: i18n.translate('xpack.apm.feedbackMenu.appName', {
    defaultMessage: 'APM'
  }),
  links: [
    {
      linkType: 'discuss',
      href: 'https://discuss.elastic.co/c/apm'
    },
    {
      linkType: 'custom',
      href: url.format({
        pathname: core.http.basePath.prepend('/app/kibana')
      }),
      text: i18n.translate('xpack.apm.helpMenu.upgradeAssistantLink', {
        defaultMessage: 'Upgrade assistant'
      })
    }
  ]
});

// @ts-ignore
chrome.setRootTemplate(template);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(REACT_APP_ROOT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};
checkForRoot().then(() => {
  plugin().start(core);
});
