import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

const typeToClassNameMap = {
  inPanel: 'kuiSideNav--inPanel',
};

export const TYPES = Object.keys(typeToClassNameMap);

export const KuiSideNav = ({
  children,
  type,
  toggleOpenOnMobile,
  isOpenOnMobile,
  mobileTitle,
  className,
  ...rest,
}) => {
  const classes = classNames(
    'kuiSideNav',
    className,
    typeToClassNameMap[type],
    {
      'kuiSideNav-isOpenMobile': isOpenOnMobile,
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
  type: PropTypes.oneOf(TYPES),
  mobileTitle: PropTypes.string,
};
