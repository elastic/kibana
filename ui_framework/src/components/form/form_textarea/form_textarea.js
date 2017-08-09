import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormTextarea = ({ children, rows, name, id, placeholder, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormTextarea', className);

  return (
    <textarea
      className={classes}
      {...rest}
      rows={rows}
      name={name}
      id={id}
      placeholder={placeholder}
    >
      {children}
    </textarea>
  );
};

KuiFormTextarea.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
};

KuiFormTextarea.defaultProps = {
  rows: 6,
};

