import React from 'react';

import {
  KuiToolBarFooter,
  KuiButtonIcon,
  KuiButton,
  KuiButtonGroup,
} from '../../../../components';

export const ToolBarFooter = () => (
  <KuiToolBarFooter>
    <div className="kuiToolBarFooterSection">
      <div className="kuiToolBarText">
        5 Items selected
      </div>
    </div>

    <div className="kuiToolBarFooterSection">
      <div className="kuiToolBarText">
        1 &ndash; 20 of 33
      </div>

      <KuiButtonGroup isUnited>
        <KuiButton
          buttonType="basic"
          aria-label="Previous"
          icon={<KuiButtonIcon type="previous" />}
        />
        <KuiButton
          buttonType="basic"
          aria-label="Next"
          icon={<KuiButtonIcon type="next" />}
        />
      </KuiButtonGroup>
    </div>
  </KuiToolBarFooter>
);
