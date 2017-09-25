import {
  cloneElement,
} from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const titleSizeToClassNameMap = {
  small: 'kuiTitle--small',
  large: 'kuiTitle--large',
};

export const TITLE_SIZES = Object.keys(titleSizeToClassNameMap);

export const KuiTitle = ({ size, children, className, ...rest }) => {

  const classes = classNames(
    'kuiTitle',
    titleSizeToClassNameMap[size],
    className
  );

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiTitle.propTypes = {
  children: PropTypes.element.isRequired,
  className: PropTypes.string,
  size: PropTypes.oneOf(TITLE_SIZES),
};
