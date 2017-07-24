import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiLargeTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiLargeTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiLargeTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};

export const KuiSmallTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSmallTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiSmallTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};

export const KuiMediumTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiMediumTitle', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiMediumTitle.PropTypes = {
  children: PropTypes.node.isRequired,
};

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
