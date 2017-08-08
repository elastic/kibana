import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormText = ({ children, label, icon, id, name, placeholder, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormText', className);

  return (
    <KuiFormRow
      id={id}
      label={label}
      helpText={helpText}
      icon={icon}
    >
      <input
        type="text"
        id={id}
        name={name}
        placeholder={placeholder}
        className={classes}
        {...rest}
      />
    </KuiFormRow>
  );
};

KuiFormText.propTypes = {
  icon: PropTypes.string,
};

KuiFormText.defaultProps = {
  icon: null,
};


