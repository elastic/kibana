import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const <%= componentName %> = ({ children, className, ...rest }) => {
  const classes = classNames('<%= cssClassName %>', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

<%= componentName %>.propTypes = {
};
