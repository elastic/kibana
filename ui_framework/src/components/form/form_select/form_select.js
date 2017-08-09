import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../../components';


export const KuiFormSelect = ({ children, options, id, name, placeholder, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormSelect', className);

  return (
      <select
        id={id}
        name={name}
        className={classes}
        {...rest}
      >
      {options.map(function(option, index) {
        return <option value={index} key={index}>{option}</option>;
      })}
    </select>
  );
};

KuiFormSelect.propTypes = {
};

KuiFormSelect.defaultProps = {
};



