import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiCheckboxGroup = ({ options, onChange, className, ...rest }) => {
  const classes = classNames('kuiCheckbox kuiCheckboxGroup__item', className);

  return (
    <div>
      {options.map((option, index) => {
        return (
          <div
            className={classes}
            key={index}
            {...rest}
          >
            <input
              className="kuiCheckbox__input"
              type="checkbox"
              id={option.id}
              checked={option.checked || false}
              onChange={onChange.bind(null, option)}
            />

            <div className="kuiCheckbox__square">
              <div className="kuiCheckbox__check" />
            </div>

            <label
              className="kuiCheckbox__label"
              htmlFor={option.id}
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
};

KuiCheckboxGroup.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      checked: PropTypes.bool,
      label: PropTypes.string,
    }),
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};

KuiCheckboxGroup.defaultProps = {
  options: [],
};
