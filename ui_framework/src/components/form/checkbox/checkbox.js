import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const typeToClassNameMap = {
  inList: 'kuiCheckbox--inList',
};

export const TYPES = Object.keys(typeToClassNameMap);

export const KuiCheckbox = ({
  className,
  id,
  checked,
  label,
  onChange,
  type,
  ...rest,
}) => {
  const classes = classNames(
    'kuiCheckbox',
    typeToClassNameMap[type],
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
  type: PropTypes.oneOf(TYPES),
};

KuiCheckbox.defaultProps = {
  checked: false,
};
