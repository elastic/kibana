import {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

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
  size: PropTypes.oneOf(TITLE_SIZES),
};

const textSizeToClassNameMap = {
  small: 'kuiText--small',
};

export const TEXT_SIZES = Object.keys(textSizeToClassNameMap);

export const KuiText = ({ size, children, className, ...rest }) => {

  const classes = classNames(
    'kuiText',
    textSizeToClassNameMap[size],
    className
  );

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiText.propTypes = {
  children: PropTypes.element.isRequired,
  size: PropTypes.oneOf(TEXT_SIZES),
};
