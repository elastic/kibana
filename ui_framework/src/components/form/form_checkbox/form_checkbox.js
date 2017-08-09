import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';


export const KuiFormCheckbox = ({ options, className, ...rest }) => {
  const classes = classNames('kuiFormCheckbox', className);

  return (
    <div>
      {options.map(function (option, index) {
        return (
          <div className={classes} key={index} {...rest}>
            <input className="kuiFormCheckbox__input" type="checkbox" id={index} />
            <div className="kuiFormCheckbox__square">
              <div className="kuiFormCheckbox__check" />
            </div>
            <label className="kuiFormCheckbox__label" htmlFor={index}>{option}</label>
          </div>
        );
      })}
    </div>
  );
};

KuiFormCheckbox.propTypes = {
  options: PropTypes.array.isRequired,
};
