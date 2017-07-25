import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const sideToClassNameMap = {
  left: 'kui--flexGrow1 kui--flex',
  right: 'kui--flexShrink1 kui--flex',
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
