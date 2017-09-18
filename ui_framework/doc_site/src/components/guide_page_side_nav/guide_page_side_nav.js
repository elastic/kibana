import PropTypes from 'prop-types';
import React from 'react';

export const GuidePageSideNav = props =>  {
  return (
    <div className="guidePageSideNav">
      <div className="guidePageSideNav__title">
        {props.title}
      </div>

      <div className="guidePageSideNavMenu">
        {props.children}
      </div>
    </div>
  );
};

GuidePageSideNav.propTypes = {
  title: PropTypes.string,
  children: PropTypes.any,
};
