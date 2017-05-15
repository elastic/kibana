import React from 'react';

import { KuiButton, KuiButtonIcon, KuiButtonGroup } from '../button';

export function KuiPagerButtons({ className, onPrevious, onNext, hasNext, hasPrevious, ...rest }) {
  return (
    <KuiButtonGroup isUnited className={className} { ...rest }>
      <KuiButton
        data-test-subj="pagerPreviousButton"
        type="basic"
        onClick={onPrevious}
        disabled={!hasPrevious}
        icon={<KuiButtonIcon type="previous" />}
      />
      <KuiButton
        data-test-subj="pagerNextButton"
        type="basic"
        onClick={onNext}
        disabled={!hasNext}
        icon={<KuiButtonIcon type="next" />}
      />
    </KuiButtonGroup>
  );
}

KuiPagerButtons.propTypes = {
  onPrevious: React.PropTypes.func.isRequired,
  onNext: React.PropTypes.func.isRequired,
  hasNext: React.PropTypes.bool.isRequired,
  hasPrevious: React.PropTypes.bool.isRequired,
  className: React.PropTypes.string
};
