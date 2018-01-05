import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiCheckBox = ({
  className,
  isChecked,
  isDisabled,
  onChange,
  ...rest
}) => {
  const classes = classNames('kuiCheckBox', className);

  return (
    <input
      type="checkbox"
      className={classes}
      checked={isChecked}
      disabled={isDisabled}
      onChange={onChange}
      {...rest}
    />
  );
};

KuiCheckBox.defaultProps = {
  isChecked: false,
  isDisabled: false,
};

KuiCheckBox.propTypes = {
  className: PropTypes.string,
  isChecked: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};
