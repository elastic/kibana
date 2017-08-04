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
      'kuiSideNav-isOpenMobile': isOpenMobile,
    },
  );

  return (
    <nav
      className={classes}
      {...rest}
    >
      {/* Hidden from view, except in mobile */}
      <button className="kuiSideNav__mobileToggle kuiLink">
        <span className="kuiSideNav__mobileWrap">
          <span className="kuiSideNav__mobileTitle">Navigate within management</span>
          <span>
            <KuiIcon
              className="kuiSideNav__mobileIcon"
              type="apps"
              size="medium"
            />
          </span>
        </span>
      </button>

      {/* Hidden from view in mobile, but toggled from the button above */}
      <div className="kuiSideNav__content">{children}</div>
    </nav>
  );
};

KuiSideNav.propTypes = {
  isOpenMobile: PropTypes.bool,
};

KuiSideNav.defaultProps = {
  isOpenMobile: false,
};
