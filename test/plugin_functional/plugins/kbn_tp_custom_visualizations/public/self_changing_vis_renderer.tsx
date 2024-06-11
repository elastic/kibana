/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { CoreSetup } from '@kbn/core-lifecycle-browser';
import { SelfChangingComponent } from './self_changing_vis/self_changing_components';
import { SelfChangingVisRenderValue } from './self_changing_vis_fn';

export const getSelfChangingVisRenderer = (core: CoreSetup) => {
  const selfChangingVisRenderer: ExpressionRenderDefinition<SelfChangingVisRenderValue> = {
    name: 'self_changing_vis',
    reuseDomNode: true,
    render: async (domNode, { visParams }, handlers) => {
      const [coreSetup] = await core.getStartServices();
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaRenderContextProvider {...coreSetup}>
          <SelfChangingComponent renderComplete={handlers.done} visParams={visParams} />
        </KibanaRenderContextProvider>,
        domNode
      );
    },
  };

  return selfChangingVisRenderer;
};
