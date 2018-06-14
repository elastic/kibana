/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './github_markdown.less';
import classNames from 'classnames';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';
import { memoize } from 'lodash';

/**
 * Return a memoized markdown rendering function that use the specified
 * whiteListedRules and openLinksInNewTab configurations.
 * @param {Array of Strings} whiteListedRules - white list of markdown rules
 * list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
 * @param {Boolean} openLinksInNewTab
 * @return {Function} Returns an Object to use with dangerouslySetInnerHTML
 * with the rendered markdown HTML
 */
export const markdownFactory = memoize((whiteListedRules = [], openLinksInNewTab = false) => {
  let markdownIt;

  // It is imperitive that the html config property be set to false, to mitigate XSS: the output of markdown-it is
  // fed directly to the DOM via React's dangerouslySetInnerHTML below.

  if (whiteListedRules && whiteListedRules.length > 0) {
    markdownIt = new MarkdownIt('zero', { html: false, linkify: true });
    markdownIt.enable(whiteListedRules);
  } else {
    markdownIt = new MarkdownIt({ html: false, linkify: true });
  }

  if (openLinksInNewTab) {
    // All links should open in new browser tab.
    // Define custom renderer to add 'target' attribute
    // https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
    const originalLinkRender = markdownIt.renderer.rules.link_open || function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
    markdownIt.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      tokens[idx].attrPush(['target', '_blank']);
      // https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
      tokens[idx].attrPush(['rel', 'noopener noreferrer']);
      return originalLinkRender(tokens, idx, options, env, self);
    };
  }
  /**
   * This method is used to render markdown from the passed parameter
   * into HTML. It will just return an empty string when the markdown is empty.
   * @param {String} markdown - The markdown String
   * @return {String} - Returns the rendered HTML as string.
   */
  return (markdown) => {
    return markdown ? markdownIt.render(markdown) : '';
  };
}, (whiteListedRules = [], openLinksInNewTab = false) => {
  return whiteListedRules.join('_').concat(openLinksInNewTab);
});

export class Markdown extends PureComponent {
  render() {
    const {
      className,
      markdown,
      openLinksInNewTab,
      whiteListedRules,
      ...rest
    } = this.props;

    const classes = classNames('markdown-body', className);
    const markdownRenderer = markdownFactory(whiteListedRules, openLinksInNewTab);
    const renderedMarkdown = markdownRenderer(markdown);
    return (
      <div
        {...rest}
        className={classes}
        /*
         * Justification for dangerouslySetInnerHTML:
         * The Markdown Visulization is, believe it or not, responsible for rendering Markdown.
         * This relies on `markdown-it` to produce safe and correct HTML.
         */
        dangerouslySetInnerHTML={{ __html: renderedMarkdown }} //eslint-disable-line react/no-danger
      />
    );
  }
}

Markdown.propTypes = {
  className: PropTypes.string,
  markdown: PropTypes.string,
  openLinksInNewTab: PropTypes.bool,
  whiteListedRules: PropTypes.arrayOf(PropTypes.string),
};
