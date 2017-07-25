import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const borderToClassNameMap = {
  left: undefined,
  right: 'kuiHeaderSectionItem--borderRight',
};

const BORDERS = Object.keys(borderToClassNameMap);

export const KuiHeaderSectionItem = ({ border, children, className, ...rest }) => {
  const classes = classNames('kuiHeaderSectionItem', borderToClassNameMap[border], className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiHeaderSectionItem.propTypes = {
  border: PropTypes.oneOf(BORDERS),
};

KuiHeaderSectionItem.defaultProps = {
  border: 'left',
};
