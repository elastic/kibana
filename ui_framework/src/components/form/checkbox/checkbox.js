import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiCheckbox = ({ options, className, ...rest }) => {
  const classes = classNames('kuiCheckbox', className);

  return (
    <div>
      {options.map((option, index) => {

        return (
          <div className={classes} key={index} {...rest}>
            <input className="kuiCheckbox__input" type="checkbox" id={option.id} defaultChecked={option.checked ? true : false} />
            <div className="kuiCheckbox__square">
              <div className="kuiCheckbox__check" />
            </div>
            <label className="kuiCheckbox__label" htmlFor={option.id}>{option.label}</label>
          </div>
        );
      })}
    </div>
  );
};

KuiCheckbox.propTypes = {
  options: PropTypes.arrayOf(React.PropTypes.object).isRequired,
};
