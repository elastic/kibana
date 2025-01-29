/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartInitializer } from '../plugin';
import { RendererStrings } from '../../i18n';
import { RendererFactory } from '../../types';

const { text: strings } = RendererStrings;

export const getTextRenderer =
  (core: CoreStart): RendererFactory<{ text: string }> =>
  () => ({
    name: 'text',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, { text: textString }, handlers) {
      ReactDOM.render(
        <KibanaRenderContextProvider {...core}>
          <div>{textString}</div>
        </KibanaRenderContextProvider>,
        domNode,
        () => handlers.done()
      );
      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  });

export const textFactory: StartInitializer<RendererFactory<{ text: string }>> = (core, _plugins) =>
  getTextRenderer(core);
