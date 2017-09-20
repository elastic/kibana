import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const sideToClassNameMap = {
  left: 'kuiHeaderSection--left',
  right: 'kuiHeaderSection--right',
};

const SIDES = Object.keys(sideToClassNameMap);

export const KuiHeaderSection = ({ side, children, className, ...rest }) => {
  const classes = classNames('kuiHeaderSection', sideToClassNameMap[side], className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiHeaderSection.propTypes = {
  side: PropTypes.oneOf(SIDES),
};

KuiHeaderSection.defaultProps = {
  side: 'left',
};
