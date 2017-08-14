import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiCheckbox = ({ options, className, ...rest }) => {
  const classes = classNames('kuiCheckbox', className);

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
              checked={option.checked}
              onChange={option.onChange}
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

KuiCheckbox.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      checked: PropTypes.bool,
      onChange: PropTypes.func.isRequired,
      label: PropTypes.string,
    }),
  ).isRequired,
};

KuiCheckbox.defaultProps = {
  options: [],
};
