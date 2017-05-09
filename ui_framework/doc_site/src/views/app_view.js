import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

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

    const currentRoute = props.routes[1];
    const nextRoute = Routes.getNextRoute(currentRoute.name);
    const previousRoute = Routes.getPreviousRoute(currentRoute.name);

    this.state = {
      isNavOpen: false,
      nextRoute,
      previousRoute,
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

  componentWillReceiveProps(nextProps) {
    const currentRoute = nextProps.routes[1];
    const nextRoute = Routes.getNextRoute(currentRoute.name);
    const previousRoute = Routes.getPreviousRoute(currentRoute.name);

    this.setState({
      nextRoute,
      previousRoute,
    });
  }

  renderPagination() {
    const previousClasses = classNames('guidePaginationButton', {
      'guidePaginationButton-isDisabled': !this.state.previousRoute,
    });

    const previousButton = (
      <Link
        className={previousClasses}
        to={this.state.previousRoute ? this.state.previousRoute.path : ''}
      >
        <span className="fa fa-angle-left"></span>
      </Link>
    );

    const nextClasses = classNames('guidePaginationButton', {
      'guidePaginationButton-isDisabled': !this.state.nextRoute,
    });

    const nextButton = (
      <Link
        className={nextClasses}
        to={this.state.nextRoute ? this.state.nextRoute.path : ''}
      >
        <span className="fa fa-angle-right"></span>
      </Link>
    );

    return (
      <div className="guidePaginationButtons">
        {previousButton}
        {nextButton}
      </div>
    );
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

        {this.renderPagination()}
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
