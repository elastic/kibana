import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

export const KuiSideNav = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNav', className);

  return (
    <nav
      className={classes}
      {...rest}
    >
      <div className="kuiSideNav__mobileToggle">
        <div className="kuiSideNav__mobileTitle">Navigate within management</div>
        <div className="kuiSideNav__mobileIconWrap"><KuiIcon className="kuiSideNav__mobileIcon" type="apps" size="medium"/></div>
      </div>
      <div className="kuiSideNav__content">{children}</div>
    </nav>
  );
};

KuiSideNav.propTypes = {
};
