import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../../components';


export const KuiFormSelect = ({ children, options, id, name, placeholder, className, ...rest }) => {
  const classes = classNames('kuiFormSelect', className);

  return (
      <select
        id={id}
        name={name}
        className={classes}
        {...rest}
      >
      {options.map(function(option, index) {
        return <option>{option}</option>;
      })}
    </select>
  );
};

KuiFormSelect.propTypes = {
};

KuiFormSelect.defaultProps = {
};



