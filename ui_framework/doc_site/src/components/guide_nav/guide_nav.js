import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  Link,
} from 'react-router';

import classNames from 'classnames';

import {
  getTheme,
  applyTheme,
} from '../../services';

export class GuideNav extends Component {
  constructor(props) {
    super(props);

    const currentRoute = props.routes[1];
    const nextRoute = this.props.getNextRoute(currentRoute.name);
    const previousRoute = this.props.getPreviousRoute(currentRoute.name);

    this.state = {
      search: '',
      nextRoute,
      previousRoute,
      theme: getTheme(),
    };

    this.onSearchChange = this.onSearchChange.bind(this);
    this.onToggleTheme = this.onToggleTheme.bind(this);
  }

  onToggleTheme() {
    if (getTheme() === 'light') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    this.setState({
      theme: getTheme(),
    });
  }

  onSearchChange(event) {
    this.setState({
      search: event.target.value,
    });
  }

  componentWillReceiveProps(nextProps) {
    const currentRoute = nextProps.routes[1];
    const nextRoute = this.props.getNextRoute(currentRoute.name);
    const previousRoute = this.props.getPreviousRoute(currentRoute.name);

    this.setState({
      nextRoute,
      previousRoute,
    });
  }

  renderNoItems(name) {
    return (
      <p className="guideNavNoItems">
        { `No ${name} match your search` }
      </p>
    );
  }

  renderPagination() {
    let hideChromeButton;

    if (this.props.isSandbox) {
      hideChromeButton = (
        <button
          className="guideLink"
          style={{ marginRight: '10px' }}
          onClick={this.props.onHideChrome}
        >
          Hide chrome
        </button>
      );
    }

    const themeButton = (
      <button
        className="guideLink"
        style={{ marginRight: '10px' }}
        onClick={this.onToggleTheme}
      >
        {this.state.theme === 'light' ? 'Dark theme' : 'Light theme'}
      </button>
    );

    const previousClasses = classNames('guideNavPaginationButton', {
      'guideNavPaginationButton-isDisabled': !this.state.previousRoute,
    });

    const previousButton = (
      <Link
        className={previousClasses}
        to={this.state.previousRoute ? this.state.previousRoute.path : ''}
      >
        <span className="fa fa-angle-left" />
      </Link>
    );

    const nextClasses = classNames('guideNavPaginationButton', {
      'guideNavPaginationButton-isDisabled': !this.state.nextRoute,
    });

    const nextButton = (
      <Link
        className={nextClasses}
        to={this.state.nextRoute ? this.state.nextRoute.path : ''}
      >
        <span className="fa fa-angle-right" />
      </Link>
    );

    return (
      <div className="guideNavPaginationButtons">
        {hideChromeButton}
        {themeButton}
        {previousButton}
        {nextButton}
      </div>
    );
  }

  render() {
    const classes = classNames('guideNav', {
      'is-guide-nav-open': this.props.isNavOpen,
      'is-chrome-hidden': !this.props.isChromeVisible,
    });

    const buttonClasses = classNames('guideNav__menu fa fa-bars', {
      'is-menu-button-pinned': this.props.isNavOpen,
    });

    const componentNavItems =
      this.props.components.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        const icon =
          item.hasReact
          ? <div className="guideNavItem__reactLogo" />
          : undefined;
        return (
          <div key={`componentNavItem-${index}`} className="guideNavItem">
            <Link
              className="guideNavItem__link"
              to={item.path}
              onClick={this.props.onClickNavItem}
            >
              {item.name}
            </Link>

            {icon}
          </div>
        );
      });

    const sandboxNavItems =
      this.props.sandboxes.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        const icon =
          item.hasReact
          ? <div className="guideNavItem__reactLogo" />
          : undefined;
        return (
          <div key={`sandboxNavItem-${index}`} className="guideNavItem">
            <Link
              className="guideNavItem__link"
              to={item.path}
              onClick={this.props.onClickNavItem}
            >
              {item.name}
            </Link>

            {icon}
          </div>
        );
      });

    return (
      <div className={classes}>
        <div className="guideNav__header">
          <div
            className={buttonClasses}
            onClick={this.props.onToggleNav}
          />
          <Link
            className="guideNav__title"
            to="/"
            onClick={this.props.onClickNavItem}
          >
            Kibana UI Framework <span className="guideNav__version">{this.props.version}</span>
          </Link>
          <a href="http://elastic.co" className="guideNav__elasticLogo" aria-label="Go to the Elastic website" />

          {this.renderPagination()}
        </div>

        <div>
          <input
            type="text"
            placeholder="Search components and sandboxes"
            className="guideNavSearch"
            value={this.state.search}
            onChange={this.onSearchChange}
          />
        </div>

        <div className="guideNavItemsContainer">
          <div className="guideNavItems">
            <div className="guideNavSectionTitle">
              Components
            </div>

            { componentNavItems.length ? componentNavItems : this.renderNoItems('components') }

            <div className="guideNavSectionTitle">
              Sandboxes
            </div>

            { sandboxNavItems.length ? sandboxNavItems : this.renderNoItems('sandboxes') }
          </div>
        </div>

        <button
          className="guideLink guideNav__showButton"
          onClick={this.props.onShowChrome}
        >
          Show chrome
        </button>
      </div>
    );
  }
}

GuideNav.propTypes = {
  isChromeVisible: PropTypes.bool,
  isNavOpen: PropTypes.bool,
  isSandbox: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onHideChrome: PropTypes.func,
  onShowChrome: PropTypes.func,
  onClickNavItem: PropTypes.func,
  version: PropTypes.string,
  routes: PropTypes.array,
  getNextRoute: PropTypes.func,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};
