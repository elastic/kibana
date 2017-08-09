import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormSwitch = ({ label, id, name, defaultChecked, className, ...rest }) => {
  const classes = classNames('kuiFormSwitch', className);

  return (
    <div className={classes} {...rest}>
      <input className="kuiFormSwitch__input" name={name} id={id} type="checkbox" defaultChecked={defaultChecked} />
      <span className="kuiFormSwitch__body">
        <span className="kuiFormSwitch__thumb" />
        <span className="kuiFormSwitch__track">
          <span className="kuiFormSwitch__icon" />
          <span className="kuiFormSwitch__icon kuiFormSwitch__icon--checked" />
        </span>
      </span>
      <label className="kuiFormSwitch__label" htmlFor={id}>{label}</label>
    </div>
  );
};

KuiFormSwitch.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool,
};

KuiFormSwitch.defaultProps = {
  defaultChecked: false,
};
