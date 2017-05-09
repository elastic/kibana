import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

import classNames from 'classnames';

export class GuideNav extends Component {
  constructor() {
    super();

    this.state = {
      search: '',
    };

    this.onSearchChange = this.onSearchChange.bind(this);
  }

  onSearchChange(event) {
    this.setState({
      search: event.target.value,
    });
  }

  renderNoItems(name) {
    return (
      <p className="guideNavNoItems">
        { `No ${name} match your search` }
      </p>
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
        return (
          <Link
            key={index}
            className="guideNavItem"
            to={item.path}
            onClick={this.props.onClickNavItem}
          >
            {item.name}
          </Link>
        );
      });

    const sandboxNavItems =
      this.props.sandboxes.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        return (
          <Link
            key={index}
            className="guideNavItem"
            to={item.path}
            onClick={this.props.onClickNavItem}
          >
            {item.name}
          </Link>
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
        </div>

        <div>
          <input
            type="text"
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
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};
