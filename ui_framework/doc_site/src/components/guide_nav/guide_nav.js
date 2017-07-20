import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

import classNames from 'classnames';

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
    };

    this.onSearchChange = this.onSearchChange.bind(this);
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
    const previousClasses = classNames('guideNavPaginationButton', {
      'guideNavPaginationButton-isDisabled': !this.state.previousRoute,
    });

    const previousButton = (
      <Link
        className={previousClasses}
        to={this.state.previousRoute ? this.state.previousRoute.path : ''}
      >
        <span className="fa fa-angle-left"></span>
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
        <span className="fa fa-angle-right"></span>
      </Link>
    );

    return (
      <div className="guideNavPaginationButtons">
        {previousButton}
        {nextButton}
      </div>
    );
  }

  render() {
    const classes = classNames('guideNav', {
      'is-guide-nav-open': this.props.isNavOpen,
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
        return (
          <div key={`sandboxNavItem-${index}`} className="guideNavItem">
            <Link
              className="guideNavItem__link"
              to={item.path}
              onClick={this.props.onClickNavItem}
            >
              {item.name}
            </Link>
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
      </div>
    );
  }
}

GuideNav.propTypes = {
  isNavOpen: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onClickNavItem: PropTypes.func,
  version: PropTypes.string,
  routes: PropTypes.array,
  getNextRoute: PropTypes.func,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};
