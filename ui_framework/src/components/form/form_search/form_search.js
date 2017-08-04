import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormSearch = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormSearch', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormSearch.propTypes = {
};
