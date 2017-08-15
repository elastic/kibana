import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSwitch = ({
  label,
  id,
  name,
  checked,
  onChange,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiSwitch', className);

  return (
    <div className={classes} {...rest}>
      <input
        className="kuiSwitch__input"
        name={name}
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />

      <span className="kuiSwitch__body">
        <span className="kuiSwitch__thumb" />
        <span className="kuiSwitch__track">
          <span className="kuiSwitch__icon" />
          <span className="kuiSwitch__icon kuiSwitch__icon--checked" />
        </span>
      </span>

      <label
        className="kuiSwitch__label"
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
};

KuiSwitch.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

KuiSwitch.defaultProps = {
  defaultChecked: false,
};
