import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const TEXTAREA_SIZE = [
  'small',
  'medium',
  'large',
];

const KuiTextArea = ({
  className,
  onChange,
  placeholder,
  value,
  isInvalid,
  isNonResizable,
  isDisabled,
  size,
  ...rest
}) => {
  const classes = classNames('kuiTextArea', className,
    { 'kuiTextArea-isInvalid': isInvalid },
    { 'kuiTextArea--nonResizable': isNonResizable },
    { 'kuiTextArea--small': size === 'small' },
    { 'kuiTextArea--large': size === 'large' },
  );

  return (
    <textarea
      className={classes}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      disabled={isDisabled}
      {...rest}
    />
  );
};

KuiTextArea.defaultProps = {
  placeholder: '',
  value: '',
  isInvalid: false,
  isNonResizable: false,
  isDisabled: false,
  size: 'medium'
};

KuiTextArea.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  isInvalid: PropTypes.bool,
  isNonResizable: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTAREA_SIZE)
};

export {
  TEXTAREA_SIZE,
  KuiTextArea
};
