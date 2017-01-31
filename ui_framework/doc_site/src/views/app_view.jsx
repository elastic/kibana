
import React, {
  Component,
  PropTypes,
} from 'react';

import classNames from 'classnames';

import {
  Routes,
} from '../services';

import {
  GuideCodeViewer,
  GuideNav,
} from '../components';

// Inject version into header.
const pkg = require('json!../../../../package.json');

export default class AppView extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isNavOpen: false,
    };

    this.onClickNavItem = this.onClickNavItem.bind(this);
    this.onToggleNav = this.onToggleNav.bind(this);
    this.onCloseCodeViewer = this.onCloseCodeViewer.bind(this);
  }

  getChildContext() {
    return {
      openCodeViewer: this.props.openCodeViewer,
      updateCodeViewer: this.props.updateCodeViewer,
      registerCode: this.props.registerCode,
      unregisterCode: this.props.unregisterCode,
    };
  }

  onClickNavItem() {
    this.setState({
      isNavOpen: false,
    });
  }

  onCloseCodeViewer() {
    this.props.closeCodeViewer();
  }

  onToggleNav() {
    this.setState({
      isNavOpen: !this.state.isNavOpen,
    })
  }

  render() {
    const contentClasses = classNames('guideContent', {
      'is-code-viewer-open': this.props.isCodeViewerOpen,
    });

    return (
      <div className="guide">
        <GuideNav
          isNavOpen={this.state.isNavOpen}
          onToggleNav={this.onToggleNav}
          onClickNavItem={this.onClickNavItem}
          version={pkg.version}
          items={Routes.components}
        />

        <div className={contentClasses}>
          {this.props.children}
        </div>

        <GuideCodeViewer
          isOpen={this.props.isCodeViewerOpen}
          onClose={this.onCloseCodeViewer}
          title={this.props.code.title}
          html={this.props.code.html || this.props.code.source}
          js={this.props.code.js}
        />
      </div>
    );
  }

}

AppView.childContextTypes = {
  openCodeViewer: PropTypes.func,
  updateCodeViewer: PropTypes.func,
  registerCode: PropTypes.func,
  unregisterCode: PropTypes.func,
};

AppView.propTypes = {
  children: PropTypes.any,
  routes: PropTypes.array.isRequired,
  openCodeViewer: PropTypes.func,
  updateCodeViewer: PropTypes.func,
  closeCodeViewer: PropTypes.func,
  registerCode: PropTypes.func,
  unregisterCode: PropTypes.func,
  isCodeViewerOpen: PropTypes.bool,
  code: PropTypes.object,
};

AppView.defaultProps = {
  code: {},
};
