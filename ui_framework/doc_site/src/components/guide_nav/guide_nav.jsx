
import React, {
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

import classNames from 'classnames';

const GuideNav = props => {
  const classes = classNames('guideNav', {
    'is-guide-nav-open': props.isNavOpen,
  });

  const buttonClasses = classNames('guideNav__menu fa fa-bars', {
    'is-menu-button-pinned': props.isNavOpen,
  });

  const navItems = props.items.map((item, index) => {
    return (
      <Link
        key={index}
        className="guideNavItem"
        to={item.path}
        onClick={props.onClickNavItem}
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
          onClick={props.onToggleNav}
        />
        <Link
          className="guideNav__title"
          to="/"
          onClick={props.onClickNavItem}
        >
          Kibana UI Framework <span className="guideNav__version">{props.version}</span>
        </Link>
      </div>

      <div className="guideNavItemsContainer">
        <div className="guideNavItems">
          {navItems}
        </div>
      </div>
    </div>
  );
};

GuideNav.propTypes = {
  isNavOpen: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onClickNavItem: PropTypes.func,
  version: PropTypes.string,
  items: PropTypes.array,
};

export default GuideNav;
