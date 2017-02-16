import React from 'react';

import { KuiIcon } from '../icon';
import { KuiButtonBasic } from '../button';

export function KuiToolBarPagerButtons({ onPrevious, onNext, hasNext, hasPrevious }) {
  return <div className="kuiButtonGroup">
    <KuiButtonBasic
      className="kuiButton--icon"
      onClick={onPrevious}
      disabled={!hasPrevious}
    >
      <KuiIcon className="fa-chevron-left"/>
    </KuiButtonBasic>
    <KuiButtonBasic
      className="kuiButton--icon"
      onClick={onNext}
      disabled={!hasNext}
    >
      <KuiIcon className="fa-chevron-right"/>
    </KuiButtonBasic>
  </div>;
}

KuiToolBarPagerButtons.propTypes = {
  onPrevious: React.PropTypes.func.isRequired,
  onNext: React.PropTypes.func.isRequired,
  hasNext: React.PropTypes.bool.isRequired,
  hasPrevious: React.PropTypes.bool.isRequired
};
