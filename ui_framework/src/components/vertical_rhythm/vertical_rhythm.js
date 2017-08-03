import {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

const sizeToClassNameMap = {
  xSmall: 'kuiVerticalRhythm--xSmall',
  small: 'kuiVerticalRhythm--small',
  large: 'kuiVerticalRhythm--large',
  xLarge: 'kuiVerticalRhythm--xLarge',
  xxLarge: 'kuiVerticalRhythm--xxLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiVerticalRhythm = ({ size, children, className, ...rest }) => {
  const classes = classNames('kuiVerticalRhythm', sizeToClassNameMap[size], className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiVerticalRhythm.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(SIZES),
};
