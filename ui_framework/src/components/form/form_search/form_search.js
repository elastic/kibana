import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormSearch = ({ children, label, id, name, placeholder, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormSearch', className);

  return (
    <KuiFormRow
      id={id}
      label={label}
      helpText={helpText}
      icon="search"
    >
      <input
        type="search"
        id={id}
        name={name}
        placeholder={placeholder}
        className={classes}
        {...rest}
      />
    </KuiFormRow>
  );
};

KuiFormSearch.propTypes = {
  icon: PropTypes.string,
};

KuiFormSearch.defaultProps = {
  icon: null,
};

