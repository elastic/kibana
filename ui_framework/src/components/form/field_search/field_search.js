import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

export const KuiFieldSearch = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiFieldSearch', className);

  return (
    <KuiFormControlLayout
      icon="search"
    >
      <input
        type="search"
        id={id}
        name={name}
        placeholder={placeholder}
        className={classes}
        value={value}
        {...rest}
      />
    </KuiFormControlLayout>
  );
};

KuiFieldSearch.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFieldSearch.defaultProps = {
  value: undefined,
};
