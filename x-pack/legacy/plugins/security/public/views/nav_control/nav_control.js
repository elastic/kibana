/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nContext } from 'ui/i18n';
import React from 'react';
import ReactDOM from 'react-dom';

import chrome from 'ui/chrome';

import 'plugins/security/services/shield_user';
import '../account/account';
import { Path } from 'plugins/xpack_main/services/path';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import {
  chromeHeaderNavControlsRegistry,
  NavControlSide,
} from 'ui/registry/chrome_header_nav_controls';
import { SecurityNavControl } from './nav_control_component';

chromeHeaderNavControlsRegistry.register((ShieldUser, kbnBaseUrl) => ({
  name: 'security',
  order: 1000,
  side: NavControlSide.Right,
  render(el) {
    const showSecurityLinks = xpackInfo.get('features.security.showLinks');
    if (Path.isUnauthenticated() || !showSecurityLinks) return null;

    const props = {
      user: ShieldUser.getCurrent(),
      editProfileUrl: chrome.addBasePath(`${kbnBaseUrl}#/account`),
      logoutUrl: chrome.addBasePath(`/logout`),
    };

    props.user.$promise.then(() => {
      // Wait for the user to be propogated before rendering into the DOM.
      ReactDOM.render(
        <I18nContext>
          <SecurityNavControl {...props} />
        </I18nContext>,
        el
      );
    });

    return () => ReactDOM.unmountComponentAtNode(el);
  },
}));
