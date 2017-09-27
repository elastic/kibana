import {
  Children,
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNavItem = ({ children, indent, isSelected }) => {
  const child = Children.only(children);

  const classes = classNames(
    child.props.className,
    'kuiSideNavItem',
    {
      'kuiSideNavItem-isSelected': isSelected,
      'kuiSideNavItem--indent': indent,
    }
  );

  return cloneElement(child, Object.assign({}, child.props, {
    className: classes,
  }));
};

KuiSideNavItem.propTypes = {
  isSelected: PropTypes.bool,
  indent: PropTypes.bool,
};
