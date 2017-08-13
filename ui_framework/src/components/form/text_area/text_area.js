import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiValidatableControl,
} from '../validatable_control';

export const KuiTextArea = ({
  children,
  rows,
  name,
  id,
  placeholder,
  className,
  isInvalid,
  ...rest,
}) => {
  const classes = classNames('kuiTextArea', className);

  return (
    <KuiValidatableControl isInvalid={isInvalid}>
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
    </KuiValidatableControl>
  );
};

KuiTextArea.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  isInvalid: PropTypes.bool,
};

KuiTextArea.defaultProps = {
  rows: 6,
};

