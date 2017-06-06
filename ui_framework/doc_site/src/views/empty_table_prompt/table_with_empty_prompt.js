import React from 'react';

import {
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiPager,
} from '../../../../components';

export function ControlledTableWithEmptyPrompt() {
  return (
    <div>
      <KuiToolBar>
        <KuiToolBarSearchBox onFilter={() => {}} />
        <div className="kuiToolBarSection">
          <KuiPager
            startNumber={0}
            endNumber={0}
            totalItems={0}
            hasNextPage={false}
            hasPreviousPage={false}
            onNextPage={() => {}}
            onPreviousPage={() => {}}
          />
        </div>
      </KuiToolBar>
      <KuiEmptyTablePromptPanel>
        <KuiEmptyTablePrompt
          addHref="#"
          itemType="item"
          promptButtonText="Add a new item"
          promptMessage="Uh oh, You have no items!"
        />
      </KuiEmptyTablePromptPanel>
    </div>
  );
}
