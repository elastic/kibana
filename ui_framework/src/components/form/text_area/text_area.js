import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiTextArea = ({ children, rows, name, id, placeholder, className, ...rest }) => {
  const classes = classNames('kuiTextArea', className);

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

KuiTextArea.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
};

KuiTextArea.defaultProps = {
  rows: 6,
};

