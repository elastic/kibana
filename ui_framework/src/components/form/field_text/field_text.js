import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

export const KuiFieldText = ({
  id,
  name,
  placeholder,
  value,
  className,
  icon,
  ...rest,
}) => {
  const classes = classNames('kuiFieldText', className, {
    'kuiFieldText--withIcon': icon,
  });

  return (
    <KuiFormControlLayout
      icon={icon}
    >
      <input
        type="text"
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

KuiFieldText.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  icon: PropTypes.string,
};

KuiFieldText.defaultProps = {
  value: undefined,
};
