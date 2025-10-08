/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import type { StartInitializer } from '../../plugin';
import { RendererStrings } from '../../../i18n';
import type { Return as Config } from '../../functions/browser/markdown';
import type { RendererFactory } from '../../../types';

const { markdown: strings } = RendererStrings;

export const getMarkdownRenderer =
  (core: CoreStart): RendererFactory<Config> =>
  () => ({
    name: 'markdown',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, config, handlers) {
      const fontStyle = config.font ? config.font.spec : {};

      ReactDOM.render(
        <KibanaRenderContextProvider {...core}>
          <Markdown
            className="canvasMarkdown"
            style={fontStyle as CSSProperties}
            markdown={config.content}
            openLinksInNewTab={config.openLinksInNewTab}
          />
        </KibanaRenderContextProvider>,
        domNode,
        () => handlers.done()
      );

      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  });

export const markdownFactory: StartInitializer<RendererFactory<Config>> = (core, _plugins) =>
  getMarkdownRenderer(core);
