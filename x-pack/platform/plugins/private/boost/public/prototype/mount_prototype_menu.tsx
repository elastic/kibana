/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { PrototypeMenu } from './prototype_menu';
import { loadPrototypeSettings } from './prototype_settings';
import { resetNewNavBadge } from './reset_new_nav_badge';

/** Renders the prototype menu into a global header slot and returns an unmount function. */
export const mountPrototypeMenu = (element: HTMLElement, core: CoreStart): (() => void) => {
  void loadPrototypeSettings(core.http);
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <PrototypeMenu
        http={core.http}
        notifications={core.notifications}
        onRestored={() => {
          resetNewNavBadge();
          window.location.reload();
        }}
      />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
