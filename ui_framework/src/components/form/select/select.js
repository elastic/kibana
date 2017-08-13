import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

export const KuiSelect = ({ className, options, id, name, ...rest }) => {
  const classes = classNames('kuiSelect', className);

  return (
    <KuiFormControlLayout
      icon="arrowDown"
      iconSide="right"
    >
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
    </KuiFormControlLayout>
  );
};

KuiSelect.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  options: PropTypes.arrayOf(React.PropTypes.object).isRequired,
};

KuiSelect.defaultProps = {
  options: [],
};
