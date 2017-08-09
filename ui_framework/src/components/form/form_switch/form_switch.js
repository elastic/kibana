import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormSwitch = ({ children, label, icon, id, name, checked, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormSwitch', className);

  return (
    <KuiFormRow
      helpText={helpText}
    >
      <div className={classes}>
        <input className="kuiFormSwitch__input" type="checkbox" id={id} defaultChecked />
        <span className="kuiFormSwitch__body">
          <span className="kuiFormSwitch__thumb"></span>
          <span className="kuiFormSwitch__track">
            <span className="kuiFormSwitch__icon"></span>
            <span className="kuiFormSwitch__icon kuiFormSwitch__icon--checked"></span>
          </span>
        </span>
        <label className="kuiFormSwitch__label" htmlFor={id}>Should we do this?</label>
      </div>
    </KuiFormRow>
  );
};

KuiFormSwitch.propTypes = {
};

KuiFormSwitch.defaultProps = {
};
