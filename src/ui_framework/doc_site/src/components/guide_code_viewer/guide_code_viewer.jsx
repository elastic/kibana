
import React, {
  Component,
  PropTypes,
} from 'react';

import classNames from 'classnames';
import hljs from 'highlight.js';

export default class GuideCodeViewer extends Component {

  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    if (this.refs.html) {
      hljs.highlightBlock(this.refs.html);
    }

    if (this.refs.javascript) {
      hljs.highlightBlock(this.refs.javascript);
    }
  }

  renderSection(title, content, codeClass) {
    if (content) {
      return (
        <div className="guideCodeViewer__section">
          <div className="guideCodeViewer__title">
            {title}
          </div>
          <pre className="guideCodeViewer__content">
            <code
              ref={codeClass}
              className={codeClass}
            >
              {content}
            </code>
          </pre>
        </div>
      );
    }
  }

  render() {
    const classes = classNames('guideCodeViewer', {
      'is-code-viewer-open': this.props.isOpen,
    });

    return (
      <div className={classes}>
        <div className="guideCodeViewer__header">
          {this.props.title}
        </div>

        <div
          className="guideCodeViewer__closeButton fa fa-times"
          onClick={this.props.onClose}
        />

        {this.renderSection('HTML', this.props.html, 'html')}
        {this.renderSection('JavaScript', this.props.js, 'javascript')}
      </div>
    );
  }

}

GuideCodeViewer.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string,
  html: PropTypes.string,
  js: PropTypes.string,
};
