import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiHeaderSectionItemButton = ({ onClick, children, className, ...rest }) => {
  const classes = classNames('kuiHeaderSectionItem__button', className);

  return (
    <button
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

KuiHeaderSectionItemButton.propTypes = {
  onClick: PropTypes.func,
};
