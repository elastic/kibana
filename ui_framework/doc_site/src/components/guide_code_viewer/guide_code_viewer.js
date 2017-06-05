import React, {
  Component,
  PropTypes,
} from 'react';

import classNames from 'classnames';
import hljs from 'highlight.js';

export class GuideCodeViewer extends Component {
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

  renderSection(type, code) {
    const typeToCodeClassMap = {
      JavaScript: 'javascript',
      HTML: 'html',
    };

    const codeClass = typeToCodeClassMap[type];

    if (code) {
      return (
        <div className="guideCodeViewer__section" key={type}>
          <div className="guideCodeViewer__title">
            {type}
          </div>
          <pre className="guideCodeViewer__content">
            <code
              ref={codeClass}
              className={codeClass}
            >
              {code}
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

    const codeSections = this.props.source.map(sourceObject => (
      this.renderSection(sourceObject.type, sourceObject.code)
    ));

    return (
      <div className={classes}>
        <div className="guideCodeViewer__header">
          {this.props.title}
        </div>

        <div
          className="guideCodeViewer__closeButton fa fa-times"
          onClick={this.props.onClose}
        />

        {codeSections}
      </div>
    );
  }
}

GuideCodeViewer.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string,
  source: PropTypes.array,
};
