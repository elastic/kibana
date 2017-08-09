import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormCheckbox = ({ children, options, label, icon, id, name, checked, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormCheckbox', className);

  return (
    <div>
      {options.map(function(option, index) {
        return <div className={classes} key={index}>
            <input className="kuiFormCheckbox__input" type="checkbox" id={index} defaultChecked />
            <div className="kuiFormCheckbox__square">
              <div className="kuiFormCheckbox__check" />
            </div>
            <label className="kuiFormCheckbox__label" htmlFor={index}>{option}</label>
          </div>;
      })}
    </div>
  );
};

KuiFormCheckbox.propTypes = {
};

KuiFormCheckbox.defaultProps = {
};
