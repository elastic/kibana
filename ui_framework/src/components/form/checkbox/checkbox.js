import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiCheckbox = ({ options, className, ...rest }) => {
  const classes = classNames('kuiCheckbox', className);

  return (
    <div>
      {options.map(function (option, index) {
        return (
          <div className={classes} key={index} {...rest}>
            <input className="kuiCheckbox__input" type="checkbox" id={index} />
            <div className="kuiCheckbox__square">
              <div className="kuiCheckbox__check" />
            </div>
            <label className="kuiCheckbox__label" htmlFor={index}>{option}</label>
          </div>
        );
      })}
    </div>
  );
};

KuiCheckbox.propTypes = {
  options: PropTypes.array.isRequired,
};
