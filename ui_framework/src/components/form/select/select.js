import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

import {
  KuiValidatableControl,
} from '../validatable_control';

export const KuiSelect = ({
  className,
  options,
  id,
  name,
  isInvalid,
  ...rest,
}) => {
  const classes = classNames('kuiSelect', className);

  return (
    <KuiFormControlLayout
      icon="arrowDown"
      iconSide="right"
    >
      <KuiValidatableControl isInvalid={isInvalid}>
        <select
          id={id}
          name={name}
          className={classes}
          {...rest}
        >
          {options.map((option, index) => {
            return <option value={option.value} key={index}>{option.text}</option>;
          })}
        </select>
      </KuiValidatableControl>
    </KuiFormControlLayout>
  );
};

KuiSelect.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  options: PropTypes.arrayOf(React.PropTypes.object).isRequired,
  isInvalid: PropTypes.bool,
};

KuiSelect.defaultProps = {
  options: [],
};
