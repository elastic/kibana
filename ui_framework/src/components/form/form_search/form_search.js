import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';


export const KuiFormSearch = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormSearch', className);

  return (
    <input
      type="search"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      value={value}
      {...rest}
    />
  );
};

KuiFormSearch.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFormSearch.defaultProps = {
  value: undefined,
};
