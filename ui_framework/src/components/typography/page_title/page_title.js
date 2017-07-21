import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiPageTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPageTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiPageTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};
