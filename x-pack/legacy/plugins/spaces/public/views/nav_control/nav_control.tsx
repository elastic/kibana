/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
// @ts-ignore
import template from 'plugins/spaces/views/nav_control/nav_control.html';
import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';
// @ts-ignore
import { Path } from 'plugins/xpack_main/services/path';
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import {
  chromeHeaderNavControlsRegistry,
  NavControlSide,
} from 'ui/registry/chrome_header_nav_controls';
// @ts-ignore
import { Space } from '../../../common/model/space';
import { SpacesHeaderNavButton } from './components/spaces_header_nav_button';

const module = uiModules.get('spaces_nav', ['kibana']);

export interface SpacesNavState {
  getActiveSpace: () => Space;
  refreshSpacesList: () => void;
}

let spacesManager: SpacesManager;

module.service('spacesNavState', (activeSpace: any) => {
  return {
    getActiveSpace: () => {
      return activeSpace.space;
    },
    refreshSpacesList: () => {
      if (spacesManager) {
        spacesManager.requestRefresh();
      }
    },
  } as SpacesNavState;
});

chromeHeaderNavControlsRegistry.register((chrome: any, activeSpace: any) => ({
  name: 'spaces',
  order: 1000,
  side: NavControlSide.Left,
  render(el: HTMLElement) {
    if (Path.isUnauthenticated()) {
      return;
    }

    const serverBasePath = chrome.getInjected('serverBasePath');

    spacesManager = new SpacesManager(serverBasePath);

    ReactDOM.render(
      <I18nContext>
        <NavControlPopover
          spacesManager={spacesManager}
          activeSpace={activeSpace}
          anchorPosition="downLeft"
          buttonClass={SpacesHeaderNavButton}
        />
      </I18nContext>,
      el
    );
  },
}));
