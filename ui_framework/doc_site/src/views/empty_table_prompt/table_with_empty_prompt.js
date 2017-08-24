import React from 'react';

import {
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiPager,
  KuiLinkButton,
  KuiButtonIcon,
  KuiButtonGroup,
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
          actions={
            <KuiButtonGroup>
              <KuiLinkButton
                icon={<KuiButtonIcon type="create"/>}
                aria-label="Add a new dashboard"
                data-test-subj="addNewDashPromptButton"
                buttonType="primary"
                href="#"
              >
                Add a new dashboard
              </KuiLinkButton>

              <KuiLinkButton
                icon={<KuiButtonIcon type="create"/>}
                aria-label="Add a new visualization"
                data-test-subj="addNewVizPromptButton"
                buttonType="primary"
                href="#"
              >
              Add a new visualization
              </KuiLinkButton>
            </KuiButtonGroup>
          }
          message="You have no items. Would you like to add one?"
        />
      </KuiEmptyTablePromptPanel>
    </div>
  );
}
