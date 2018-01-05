import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiCheckBox } from './check_box';

export const KuiCheckBoxLabel = ({
  className,
  text,
  isChecked,
  isDisabled,
  onChange,
  ...rest
}) => {
  const classes = classNames('kuiCheckBoxLabel', className);

  return (
    <label
      className={classes}
      {...rest}
    >
      <KuiCheckBox
        isChecked={isChecked}
        isDisabled={isDisabled}
        onChange={onChange}
      />
      <span className="kuiCheckBoxLabel__text">
        {text}
      </span>
    </label>
  );
};

KuiCheckBoxLabel.defaultProps = {
  isChecked: false,
  isDisabled: false,
};

KuiCheckBoxLabel.propTypes = {
  className: PropTypes.string,
  text: PropTypes.string,
  isChecked: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};
