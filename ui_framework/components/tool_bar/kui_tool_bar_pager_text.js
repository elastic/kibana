import React from 'react';

export function KuiToolBarPagerText({ startNumber, endNumber, totalCount }) {
  return <div className="kuiToolBarText">
    {startNumber}&ndash;{endNumber} of {totalCount}
  </div>;
}
KuiToolBarPagerText.propTypes = {
  startNumber: React.PropTypes.number.isRequired,
  endNumber: React.PropTypes.number.isRequired,
  totalCount: React.PropTypes.number.isRequired
};
