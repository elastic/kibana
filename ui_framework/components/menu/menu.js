import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const getClassName = ({ className, contained = false }) =>
  classNames('kuiMenu', className, {
    'kuiMenu--contained': contained
  });


const KuiMenu = ({
  contained,
  className,
  children,
  ...rest
}) => {
  return (
    <ul
      className={getClassName({
        className,
        contained,
      })}
      {...rest}
    >
      {children}
    </ul>
  );
};

KuiMenu.propTypes = {
  contained: PropTypes.bool,
  className: React.PropTypes.string,
  children:  PropTypes.node
};

export {
  KuiMenu
};
