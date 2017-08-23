import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiButtonEmpty,
} from '../../components';

export const KuiPaginationButton = ({
  children,
  className,
  isActive,
  isPlaceholder,
  hideOnMobile,
  ...rest,
}) => {
  const classes = classNames('kuiPaginationButton', className, {
    'kuiPaginationButton-isActive': isActive,
    'kuiPaginationButton-isPlaceholder': isPlaceholder,
    'kuiPaginationButton--hideOnMobile': hideOnMobile,
  });

  return (
    <KuiButtonEmpty
      className={classes}
      size="small"
      {...rest}
    >
      {children}
    </KuiButtonEmpty>
  );
};

KuiPaginationButton.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isActive: PropTypes.bool,
  isPlaceholder: PropTypes.bool,
  hideOnMobile: PropTypes.bool,
};

KuiPaginationButton.defaultProps = {
  children: <span>&hellip;</span>,
};
