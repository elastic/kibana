import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormTextarea = ({ children, rows, placeholder, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormTextarea', className);

  return (
    <textarea
      className={classes}
      {...rest}
      rows={rows}
      placeholder={placeholder}
    >
      {children}
    </textarea>
  );
};

KuiFormTextarea.propTypes = {
  rows: PropTypes.number,
};

KuiFormTextarea.defaultProps = {
  rows: 6,
};

