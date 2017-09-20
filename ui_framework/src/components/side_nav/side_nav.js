import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

export const KuiSideNav = ({
  children,
  isInPanel,
  toggleOpenOnMobile,
  isOpenOnMobile,
  mobileTitle,
  className,
  ...rest,
}) => {
  const classes = classNames(
    'kuiSideNav',
    className,
    {
      'kuiSideNav-isOpenMobile': isOpenOnMobile,
      'kuiSideNav--inPanel': isInPanel,
    },
  );

  return (
    <nav
      className={classes}
      {...rest}
    >
      {/* Hidden from view, except in mobile */}
      <button
        className="kuiSideNav__mobileToggle kuiLink"
        onClick={toggleOpenOnMobile}
      >
        <span className="kuiSideNav__mobileWrap">
          <span className="kuiSideNav__mobileTitle">
            {mobileTitle}
          </span>

          <KuiIcon
            className="kuiSideNav__mobileIcon"
            type="apps"
            size="medium"
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Hidden from view in mobile, but toggled from the button above */}
      <div className="kuiSideNav__content">
        {children}
      </div>
    </nav>
  );
};

KuiSideNav.propTypes = {
  toggleOpenOnMobile: PropTypes.func,
  isOpenOnMobile: PropTypes.bool,
  isInPanel: PropTypes.bool,
  mobileTitle: PropTypes.string,
};
