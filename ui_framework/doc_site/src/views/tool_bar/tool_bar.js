import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiButton,
  KuiButtonIcon,
  KuiButtonGroup,
} from '../../../../components';

export const ToolBar = () => (
  <KuiToolBar>
    <KuiToolBarSearchBox onFilter={() => {}} />

    <div>
      <select className="kuiSelect">
        <option>Past hour</option>
        <option>Past day</option>
        <option>Past week</option>
      </select>
    </div>

    <div className="kuiToolBarSection">
      <KuiButton
        buttonType="primary"
        icon={<KuiButtonIcon type="create" />}
      >
        Create
      </KuiButton>

      <KuiButton
        buttonType="danger"
        icon={<KuiButtonIcon type="delete" />}
      >
        Delete
      </KuiButton>
    </div>

    <div className="kuiToolBarSection">

      <div className="kuiToolBarText">
        1 &ndash; 20 of 33
      </div>

      <KuiButtonGroup isUnited>
        <KuiButton
          buttonType="basic"
          icon={<KuiButtonIcon type="previous" />}
        >
        </KuiButton>
        <KuiButton
          buttonType="basic"
          icon={<KuiButtonIcon type="next" />}
        >
        </KuiButton>
      </KuiButtonGroup>
    </div>
  </KuiToolBar>
  );
