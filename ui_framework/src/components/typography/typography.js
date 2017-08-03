import {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

const titleSizeToClassNameMap = {
  small: 'kuiTitle--small',
  large: 'kuiTitle--large',
};

const titleSizeToVerticalRhythmClassNameMap = {
  small: 'kuiVerticalRhythm',
  large: 'kuiVerticalRhythm--xLarge',
};

export const TITLE_SIZES = Object.keys(titleSizeToClassNameMap);

export const KuiTitle = ({ size, verticalRhythm, children, className, ...rest }) => {
  const verticalRhythmClass =
    verticalRhythm
    ? titleSizeToVerticalRhythmClassNameMap[size] || 'kuiVerticalRhythm--large'
    : undefined;

  const classes = classNames(
    'kuiTitle',
    titleSizeToClassNameMap[size],
    verticalRhythmClass,
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
  verticalRhythm: PropTypes.bool,
};

const textSizeToClassNameMap = {
  small: 'kuiText--small',
};

const textSizeToVerticalRhythmClassNameMap = {
  small: 'kuiVerticalRhythm--small',
};

export const TEXT_SIZES = Object.keys(textSizeToClassNameMap);

export const KuiText = ({ size, verticalRhythm, children, className, ...rest }) => {
  const verticalRhythmClass =
    verticalRhythm
    ? textSizeToVerticalRhythmClassNameMap[size] || 'kuiVerticalRhythm'
    : undefined;

  const classes = classNames(
    'kuiText',
    textSizeToClassNameMap[size],
    verticalRhythmClass,
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
  verticalRhythm: PropTypes.bool,
};
