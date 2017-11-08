import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import { KuiPagerButtonGroup } from './pager_button_group';

export function KuiPager({
  className,
  startNumber,
  endNumber,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onNextPage,
  onPreviousPage,
  ...rest
}) {
  const classes = classNames('kuiPager', className);
  return (
    <div className={classes} {...rest}>
      <div className="kuiPagerText">{startNumber}&ndash;{endNumber} of {totalItems}</div>
      {
        (startNumber === 1 && endNumber === totalItems)
          ? null
          : <KuiPagerButtonGroup
            hasNext={hasNextPage}
            hasPrevious={hasPreviousPage}
            onNext={onNextPage}
            onPrevious={onPreviousPage}
          />
      }
    </div>
  );
}

KuiPager.propTypes = {
  startNumber: PropTypes.number.isRequired,
  endNumber: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  hasPreviousPage: PropTypes.bool.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  onNextPage: PropTypes.func.isRequired,
  onPreviousPage: PropTypes.func.isRequired,
  className: PropTypes.string
};


