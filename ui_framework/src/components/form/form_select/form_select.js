import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormSelect = ({ className, options, id, name, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormSelect', className);

  return (
    <select
      id={id}
      name={name}
      className={classes}
      {...rest}
    >
      {options.map(function (option, index) {
        return <option value={index} key={index}>{option}</option>;
      })}
    </select>
  );
};

KuiFormSelect.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  options: PropTypes.array.isRequired,
};




