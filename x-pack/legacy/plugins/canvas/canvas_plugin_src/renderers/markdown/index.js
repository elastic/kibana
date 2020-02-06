/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Markdown from 'markdown-it';
import { getSecureRelForTarget } from '@elastic/eui';
import { RendererStrings } from '../../../i18n';

const { markdown: strings } = RendererStrings;

const md = new Markdown({ linkify: true });

export const markdown = () => ({
  name: 'markdown',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const fontStyle = config.font ? config.font.spec : {};
    const openLinksInNewTab = config.openLinksInNewTab;

    if (openLinksInNewTab) {
      // All links should open in new browser tab.
      // Define custom renderer to add 'target' attribute
      // https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
      const originalLinkRender =
        md.renderer.rules.link_open ||
        function(tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };
      md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
        const href = tokens[idx].attrGet('href');
        const target = '_blank';
        const rel = getSecureRelForTarget({ href: href === null ? undefined : href, target });

        // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
        tokens[idx].attrPush(['target', target]);
        if (rel) {
          tokens[idx].attrPush(['rel', rel]);
        }
        return originalLinkRender(tokens, idx, options, env, self);
      };
    } else {
      md.renderer.rules.link_open = undefined;
    }

    const html = { __html: md.render(String(config.content)) };

    /* eslint-disable react/no-danger */
    ReactDOM.render(
      <div
        className="kbnMarkdown__body canvasMarkdown"
        style={fontStyle}
        dangerouslySetInnerHTML={html}
      />,
      domNode,
      () => handlers.done()
    );
    /* eslint-enable */

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
