/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesManager } from 'plugins/spaces/lib/spaces_manager';
import { NavControlPopover } from 'plugins/spaces/views/nav_control/nav_control_popover';
// @ts-ignore
import { Path } from 'plugins/xpack_main/services/path';
import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'src/core/public';
import { SpacesHeaderNavButton } from './components/spaces_header_nav_button';

export function initSpacesNavControl(spacesManager: SpacesManager, core: CoreStart) {
  const I18nContext = core.i18n.Context;
  core.chrome.navControls.registerLeft({
    order: 1000,
    mount(targetDomElement: HTMLElement) {
      if (Path.isUnauthenticated()) {
        return () => null;
      }

      ReactDOM.render(
        <I18nContext>
          <NavControlPopover
            spacesManager={spacesManager}
            anchorPosition="downLeft"
            buttonClass={SpacesHeaderNavButton}
          />
        </I18nContext>,
        targetDomElement
      );

      return () => {
        ReactDOM.unmountComponentAtNode(targetDomElement);
      };
    },
  });
}
