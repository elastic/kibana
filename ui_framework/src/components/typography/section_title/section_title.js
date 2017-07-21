import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSectionTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSectionTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiSectionTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};
