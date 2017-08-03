import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

export const KuiSideNav = ({ children, isOpenMobile, className, ...rest }) => {
  const classes = classNames(
    'kuiSideNav',
    className,
    {
      'isOpenMobile': isOpenMobile,
    },
  );

  return (
    <nav
      className={classes}
      {...rest}
    >
      <button className="kuiSideNav__mobileToggle kuiLink">
        <span className="kuiSideNav__mobileTitle">Navigate within management</span>
        <span><KuiIcon className="kuiSideNav__mobileIcon" type="apps" size="medium"/></span>
      </button>
      <div className="kuiSideNav__content">{children}</div>
    </nav>
  );
};

KuiSideNav.propTypes = {
  isOpenMobile: PropTypes.string,
};
