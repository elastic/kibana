import React, {
  cloneElement,
  Children,
} from 'react';
import classNames from 'classnames';

export const KuiGlobalToastList = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGlobalToastList', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {Children.map(children, child => (
        cloneElement(child, Object.assign({}, child.props, {
          className: classNames(child.props.className, 'kuiGlobalToastList__item'),
        }))
      ))}
    </div>
  );
};

KuiGlobalToastList.propTypes = {
};
