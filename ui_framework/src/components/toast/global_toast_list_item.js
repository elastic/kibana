import {
  cloneElement,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGlobalToastListItem = ({ isDismissed, children }) => {
  const classes = classNames('kuiGlobalToastListItem', children.props.className, {
    'kuiGlobalToastListItem-isDismissed': isDismissed,
  });

  return cloneElement(children, Object.assign({}, children.props, {
    className: classes,
  }));
};

KuiGlobalToastListItem.propTypes = {
  isDismissed: PropTypes.bool,
  children: PropTypes.node,
};
