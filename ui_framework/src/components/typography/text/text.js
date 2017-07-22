import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiText', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiText.PropTypes = {
  children: PropTypes.node.isRequired,
};
