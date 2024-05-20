/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Plugin, CoreSetup } from '@kbn/core/public';

export class RenderingPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'rendering',
      title: 'Rendering',
      appRoute: '/render/core',
      async mount({ element }) {
        render(<h1 data-test-subj="renderingHeader">rendering service</h1>, element);

        return () => unmountComponentAtNode(element);
      },
    });

    core.application.register({
      id: 'custom-app-route',
      title: 'Custom App Route',
      appRoute: '/custom/appRoute',
      async mount({ element }) {
        render(<h1 data-test-subj="customAppRouteHeader">Custom App Route</h1>, element);

        return () => unmountComponentAtNode(element);
      },
    });
  }

  public start() {}

  public stop() {}
}
