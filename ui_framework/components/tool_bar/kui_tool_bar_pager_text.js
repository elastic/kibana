import React from 'react';

import { KuiToolBarText } from './index';

export function KuiToolBarPagerText({ start, end, count }) {
  return <KuiToolBarText>{start}&ndash;{end} of {count}</KuiToolBarText>;
}
KuiToolBarPagerText.propTypes = {
  start: React.PropTypes.number.isRequired,
  end: React.PropTypes.number.isRequired,
  count: React.PropTypes.number.isRequired
};
