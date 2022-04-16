/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { SelfChangingComponent } from './self_changing_vis/self_changing_components';
import { SelfChangingVisRenderValue } from './self_changing_vis_fn';

export const selfChangingVisRenderer: ExpressionRenderDefinition<SelfChangingVisRenderValue> = {
  name: 'self_changing_vis',
  reuseDomNode: true,
  render: (domNode, { visParams }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(<SelfChangingComponent renderComplete={handlers.done} visParams={visParams} />, domNode);
  },
};
