import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiCheckbox = ({
  className,
  id,
  checked,
  label,
  onChange,
  alternateStyle,
  ...rest,
}) => {
  const classes = classNames(
    'kuiCheckbox',
    {
      'kuiCheckbox--alternate': alternateStyle,
    },
    className
  );

  let optionalLabel;

  if (label) {
    optionalLabel = (
      <label
        className="kuiCheckbox__label"
        htmlFor={id}
      >
        {label}
      </label>
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      <input
        className="kuiCheckbox__input"
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
      />

      <div className="kuiCheckbox__square">
        <div className="kuiCheckbox__check" />
      </div>

      {optionalLabel}
    </div>
  );
};

KuiCheckbox.propTypes = {
  className: PropTypes.string,
  id: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  alternateStyle: PropTypes.bool,
};

KuiCheckbox.defaultProps = {
  checked: false,
  alternateStyle: false,
};
