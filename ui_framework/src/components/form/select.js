import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const SELECT_SIZE = [
  'small',
  'medium',
  'large',
];

const KuiSelect = ({
  className,
  onChange,
  value,
  isInvalid,
  isDisabled,
  size,
  children,
  ...rest
}) => {
  const classes = classNames('kuiSelect', className,
    { 'kuiSelect-isInvalid': isInvalid },
    { 'kuiSelect--small': size === 'small' },
    { 'kuiSelect--large': size === 'large' },
  );

  return (
    <select
      className={classes}
      onChange={onChange}
      value={value}
      disabled={isDisabled}
      {...rest}
    >
      {children}
    </select>
  );
};

KuiSelect.defaultProps = {
  value: '',
  isInvalid: false,
  isDisabled: false,
  size: 'medium'
};

KuiSelect.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  isInvalid: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(SELECT_SIZE),
  children: PropTypes.node
};

export {
  SELECT_SIZE,
  KuiSelect
};
