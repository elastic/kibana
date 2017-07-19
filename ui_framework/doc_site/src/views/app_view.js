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
const pkg = require('../../../../package.json');

export class AppView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isNavOpen: false,
    };

    this.onClickNavItem = this.onClickNavItem.bind(this);
    this.onToggleNav = this.onToggleNav.bind(this);
    this.onCloseCodeViewer = this.onCloseCodeViewer.bind(this);
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
    });
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
          routes={this.props.routes}
          getNextRoute={Routes.getNextRoute}
          getPreviousRoute={Routes.getPreviousRoute}
          components={Routes.components}
          sandboxes={Routes.sandboxes}
        />

        <div className={contentClasses}>
          {this.props.children}
        </div>

        <GuideCodeViewer
          isOpen={this.props.isCodeViewerOpen}
          onClose={this.onCloseCodeViewer}
          title={this.props.title}
          source={this.props.source}
        />
      </div>
    );
  }
}

AppView.propTypes = {
  children: PropTypes.any,
  routes: PropTypes.array.isRequired,
  openCodeViewer: PropTypes.func,
  closeCodeViewer: PropTypes.func,
  isCodeViewerOpen: PropTypes.bool,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
  sections: PropTypes.array,
  source: PropTypes.array,
  title: PropTypes.string,
};

AppView.defaultProps = {
  source: [],
};
