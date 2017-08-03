import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const verticalPositionToClassNameMap = {
  center: 'kuiPageContent--verticalCenter',
};

const horizontalPositionToClassNameMap = {
  center: 'kuiPageContent--horizontalCenter',
};

export const VERTICAL_POSITIONS = Object.keys(verticalPositionToClassNameMap);
export const HORIZONTAL_POSITIONS = Object.keys(horizontalPositionToClassNameMap);

export const KuiPageContent = ({ verticalPosition, horizontalPosition, children, className, ...rest }) => {
  const classes = classNames(
    'kuiPageContent',
    className,
    verticalPositionToClassNameMap[verticalPosition],
    horizontalPositionToClassNameMap[horizontalPosition]
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiPageContent.propTypes = {
  verticalPosition: PropTypes.oneOf(VERTICAL_POSITIONS),
  horizontalPosition: PropTypes.oneOf(HORIZONTAL_POSITIONS),
};
