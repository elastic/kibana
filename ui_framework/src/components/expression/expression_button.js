import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiExpressionButton = ({
  className,
  description,
  buttonValue,
  isActive,
  onClick,
  ...rest
}) => {
  const classes = classNames('kuiExpressionButton', className, {
    'kuiExpressionButton-isActive': isActive
  });

  return (
    <button
      className={classes}
      onClick={onClick}
      {...rest}
    >
      <span className="kuiExpressionButton__description">{description}</span>{' '}
      <span className="kuiExpressionButton__value">{buttonValue}</span>
    </button>
  );
};

KuiExpressionButton.propTypes = {
  className: PropTypes.string,
  description: PropTypes.string.isRequired,
  buttonValue: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

KuiExpressionButton.defaultProps = {
  isActive: false,
};
