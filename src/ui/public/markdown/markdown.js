import './github_markdown.less';
import classNames from 'classnames';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';

/**
 * @param {Array of Strings} whiteListedRules - white list of markdown rules
 * list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
 * @param {Boolean} openLinksInNewTab
 * @return {MarkdownIt}
 */
export function markdownFactory(whiteListedRules, openLinksInNewTab = false) {
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

export class Markdown extends Component {
  constructor(props) {
    super(props);

    this.markdownIt = markdownFactory(this.props.whiteListedRules, this.props.openLinksInNewTab);

    this.state = {
      renderedMarkdown: this.transformMarkdown(this.props)
    };


  }

  /**
   * This method is used to actually render markdown from the passed parameter
   * into HTML. It will just return an empty string when the markdown is empty.
   * Since we want to use this with dangerouslySetInnerHTML, this method returns
   * the required object format with an __html key in it.
   */
  transformMarkdown(params) {
    if (!params.markdown) {
      return { __html: '' };
    }
    return { __html: this.markdownIt.render(params.markdown) };
  }

  componentWillReceiveProps(props) {
    if (props.markdown !== this.props.markdown) {
      this.setState({
        renderedMarkdown: this.transformMarkdown(props)
      });
    }
  }

  render() {
    const {
      className,
      markdown, //eslint-disable-line no-unused-vars
      openLinksInNewTab, //eslint-disable-line no-unused-vars
      whiteListedRules, //eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    const classes = classNames(
      'markdown-body',
      className
    );

    return (
      <div
        className={classes}
        {...rest}
        dangerouslySetInnerHTML={this.state.renderedMarkdown}
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
