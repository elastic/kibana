import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';


export const KuiFormSearch = ({ children, label, id, name, placeholder, className, ...rest }) => {
  const classes = classNames('kuiFormSearch', className);

  return (
    <input
      type="search"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      {...rest}
    />
  );
};

KuiFormSearch.propTypes = {
};

KuiFormSearch.defaultProps = {
};

