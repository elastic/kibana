import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const TEXTINPUT_SIZE = [
  'small',
  'medium',
  'large',
];

export const KuiTextInput = ({
  className,
  onChange,
  placeholder,
  value,
  autoFocus,
  isInvalid,
  isDisabled,
  size,
  ...rest
}) => {
  const classes = classNames('kuiTextInput', className,
    { 'kuiTextInput-isInvalid': isInvalid },
    { 'kuiTextInput--small': size === 'small' },
    { 'kuiTextInput--large': size === 'large' },
  );

  return (
    <input
      type="text"
      className={classes}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      disabled={isDisabled}
      {...rest}
    />
  );
};

KuiTextInput.defaultProps = {
  placeholder: '',
  value: '',
  autoFocus: false,
  isInvalid: false,
  isDisabled: false,
  size: 'medium'
};

KuiTextInput.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  autoFocus: PropTypes.bool,
  isInvalid: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTINPUT_SIZE)
};
