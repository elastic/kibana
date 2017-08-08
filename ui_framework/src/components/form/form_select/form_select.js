import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';
import { KuiIcon } from '../../../components';


export const KuiFormSelect = ({ children, label, id, name, placeholder, helpText, className, ...rest }) => {
  const classes = classNames('kuiFormSelect', className);

  return (
    <KuiFormRow
      id={id}
      label={label}
      helpText={helpText}
      icon="arrowDown"
      className="kuiFormRow--dropdown"
    >
      <select
        id={id}
        name={name}
        className={classes}
        {...rest}
      >
       <option>Something</option>
       <option>Something again</option>
    </select>
    </KuiFormRow>
  );
};

KuiFormSelect.propTypes = {
};

KuiFormSelect.defaultProps = {
};



