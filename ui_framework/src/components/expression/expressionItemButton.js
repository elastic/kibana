import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiExpressionItemButton = ({
  className,
  description,
  value,
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
      <span className="kuiExpression_buttonValue">{value}</span>
    </button>
  );
};

KuiExpressionItemButton.propTypes = {
  className: PropTypes.string,
  description: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};
