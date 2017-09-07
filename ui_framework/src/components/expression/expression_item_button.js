import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiExpressionItemButton = ({
  className,
  description,
  buttonValue,
  isActive,
  onClick,
  ...rest
}) => {
  const classes = classNames('kuiExpressionItem__button', className, {
    'kuiExpressionItem__button--isActive': isActive
  });

  return (
    <button
      className={classes}
      onClick={onClick}
      {...rest}
    >
      <span className="kuiExpressionItem__buttonDescription">{description}</span>{' '}
      <span className="kuiExpressionItem__buttonValue">{buttonValue}</span>
    </button>
  );
};

KuiExpressionItemButton.propTypes = {
  className: PropTypes.string,
  description: PropTypes.string.isRequired,
  buttonValue: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};
