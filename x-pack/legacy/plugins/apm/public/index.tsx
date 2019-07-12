/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import 'react-vis/dist/style.css';
import { CoreStart } from 'src/core/public';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import 'uiExports/autocompleteProviders';
import { GlobalHelpExtension } from './components/app/GlobalHelpExtension';
import { plugin } from './new-platform';
import { REACT_APP_ROOT_ID } from './new-platform/plugin';
import './style/global_overrides.css';
import template from './templates/index.html';

// render APM feedback link in global help menu
chrome.helpExtension.set(domElement => {
  ReactDOM.render(<GlobalHelpExtension />, domElement);
  return () => {
    ReactDOM.unmountComponentAtNode(domElement);
  };
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
  const core = {
    i18n: {
      Context: I18nContext
    }
  } as CoreStart;
  plugin().start(core);
});
