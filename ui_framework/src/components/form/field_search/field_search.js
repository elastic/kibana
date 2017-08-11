import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';


export const KuiFieldSearch = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiFieldSearch', className);

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

KuiFieldSearch.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFieldSearch.defaultProps = {
  value: undefined,
};
