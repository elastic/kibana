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
    ...rest,
  }) {
  const classes = classNames('kuiPager', className);
  return (
    <div className={classes} { ...rest }>
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
  startNumber: React.PropTypes.number.isRequired,
  endNumber: React.PropTypes.number.isRequired,
  totalItems: React.PropTypes.number.isRequired,
  hasPreviousPage: React.PropTypes.bool.isRequired,
  hasNextPage: React.PropTypes.bool.isRequired,
  onNextPage: React.PropTypes.func.isRequired,
  onPreviousPage: React.PropTypes.func.isRequired,
  className: React.PropTypes.string
};


