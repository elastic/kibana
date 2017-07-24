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
