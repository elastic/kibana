import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiObjectTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiObjectTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiObjectTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};
