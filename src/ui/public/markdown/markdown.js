import './github_markdown.less';
import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';

/**
 * @param {Array of Strings} whiteListedRules - white list of markdown rules
 * list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
 * @param {Boolean} openLinksInNewTab
 * @return {MarkdownIt}
 */
function markdownFactory(whiteListedRules, openLinksInNewTab = false) {
  let markdownIt;
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

  return markdownIt;
}

export const Markdown = ({
  className,
  markdown,
  openLinksInNewTab,
  whiteListedRules,
  ...rest
}) => {

  const classes = classNames(
    'markdown-body',
    className
  );

  let transformedMarkdown = '';
  if (markdown) {
    const markdownIt = markdownFactory(whiteListedRules, openLinksInNewTab);
    transformedMarkdown = markdownIt.render(markdown);
  }

  return (
    <div
      className={classes}
      {...rest}
      dangerouslySetInnerHTML={{ __html: transformedMarkdown }}
    />
  );
};

Markdown.propTypes = {
  className: PropTypes.string,
  markdown: PropTypes.string,
  openLinksInNewTab: PropTypes.bool,
  whiteListedRules: PropTypes.arrayOf(PropTypes.string),
};
