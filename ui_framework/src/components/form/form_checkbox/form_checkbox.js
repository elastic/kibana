import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormCheckbox = ({ children, label, icon, id, name, checked, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormCheckbox', className);

  return (
    <div className={classes}>
      <input className="kuiFormCheckbox__input" type="checkbox" id={id} defaultChecked />
      <div className="kuiFormCheckbox__square">
        <div className="kuiFormCheckbox__check" />
      </div>
      <label className="kuiFormCheckbox__label" htmlFor={id}>{label}</label>
    </div>
  );
};

KuiFormCheckbox.propTypes = {
};

KuiFormCheckbox.defaultProps = {
};
