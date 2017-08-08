import {
  Children,
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNavItem = ({ children, isSelected }) => {
  const child = Children.only(children);

  const classes = classNames(
    child.props.className,
    'kuiSideNavItem',
    {
      'kuiSideNavItem-isSelected': isSelected,
    }
  );

  return cloneElement(child, Object.assign({}, child.props, {
    className: classes,
  }));
};

KuiSideNavItem.propTypes = {
  isSelected: PropTypes.bool,
};
