
import React, {
  Component,
  PropTypes,
} from 'react';

import classNames from 'classnames';

import {
  JsInjector,
} from '../../services';

export default class GuidePageSection extends Component {

  constructor(props) {
    super(props);

    this.onClickSource = this.onClickSource.bind(this);
  }

  componentDidMount() {
    // NOTE: This will cause a race condition if a GuidePage adds and removes
    // GuidePageSection instances during its lifetime (e.g. if a user is allowed
    // to click "add" and "delete" buttons to add and remove GuidePageSections).
    //
    // In such a race condition, we could end up with GuidePageSections with
    // identical id values.
    //
    // As long as all GuidePageSection instances are added when a GuidePage
    // is instantiated, and then they're all removed when a GuidePage is
    // removed, we won't encounter this race condition.
    if (this.props.js) {
      this.scriptId = `${GuidePageSection.SCRIPT_ID}${GuidePageSection.count}`;
      GuidePageSection.count++;
      // JS injection must occur _after_ the component has been mounted, so
      // the component DOM is available for the JS to manipulate.
      JsInjector.inject(this.props.js, this.scriptId);
    }

    function trimChildren(node) {
      if (node.children.length > 0) {
        [...node.children].forEach(trimChildren);
        return;
      }
      node.textContent = node.textContent.trim();
    }

    trimChildren(this.refs.html);

    if (this.refs.htmlDarkTheme) {
      trimChildren(this.refs.htmlDarkTheme);
    }
  }

  componentWillUnmount() {
    JsInjector.remove(this.scriptId);
    GuidePageSection.count--;
  }

  onClickSource() {
    this.context.openCodeViewer(this.props.slug);
  }

  render() {
    const exampleClasses = classNames('guidePageSection__example', {
      'guidePageSection__example--standalone': !this.props.children,
    });

    let description;

    if (this.props.children) {
      description = (
        <div className="guidePageSection__description">
          {this.props.children}
        </div>
      );
    }

    let darkThemeExample;

    if (this.props.hasDarkTheme) {
      darkThemeExample = (
        <div
          ref="htmlDarkTheme"
          className={`${exampleClasses} theme-dark`}
          dangerouslySetInnerHTML={{ __html: this.props.html }}
        />
      );
    } else {
      darkThemeExample = (
        <div className="guideWarning">This component is missing Dark Theme variations.</div>
      );
    }

    return (
      <div
        id={this.props.slug}
        className="guidePageSection"
      >
        <div className="guidePageSection__header">
          <div className="guidePageSection__title">
            {this.props.title}
          </div>
          <div
            className="guidePageSection__sourceButton fa fa-code"
            onClick={this.onClickSource}
          />
        </div>

        {description}

        <div
          ref="html"
          className={exampleClasses}
          dangerouslySetInnerHTML={{ __html: this.props.html }}
        />

        {darkThemeExample}
      </div>
    );
  }

}

GuidePageSection.count = 0;
GuidePageSection.SCRIPT_ID = 'EXAMPLE_SCRIPT';

GuidePageSection.contextTypes = {
  openCodeViewer: PropTypes.func,
};

GuidePageSection.propTypes = {
  title: PropTypes.string,
  slug: PropTypes.string,
  html: PropTypes.string,
  js: PropTypes.string,
  children: PropTypes.any,
  hasDarkTheme: PropTypes.bool,
};
