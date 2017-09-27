import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { VISUALIZATION_COLORS } from '../../services/colors/visualization_colors';

const sizeToClassNameMap = {
  'none': null,
  's': 'kuiAvatar--s',
  'm': 'kuiAvatar--m',
  'l': 'kuiAvatar--l',
  'xl': 'kuiAvatar--xl',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiAvatar = ({
  image,
  name,
  className,
  size,
  ...rest,
}) => {
  const classes = classNames(
    'kuiAvatar',
    sizeToClassNameMap[size],
    className
  );

  let optionalBackgroundImage;

  if (image) {
    optionalBackgroundImage = 'url(' + image + ')';
  } else {
    optionalBackgroundImage = 'none';
  }

  let optionalInitial;
  if (name && !image) {
    optionalInitial = (
      <span aria-hidden="true">{name.substring(0,1)}</span>
    );
  }

  const assignedColor = VISUALIZATION_COLORS[Math.floor(name.length % VISUALIZATION_COLORS.length)];

  const avatarStyle = {
    backgroundImage: optionalBackgroundImage,
    backgroundColor: assignedColor,
  };

  return (
    <div
      className={classes}
      style={avatarStyle}
      aria-label={name}
      {...rest}
    >
      {optionalInitial}
    </div>
  );
};

KuiAvatar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  name: PropTypes.string.isRequired,
};

KuiAvatar.defaultProps = {
  size: 'm',
};
