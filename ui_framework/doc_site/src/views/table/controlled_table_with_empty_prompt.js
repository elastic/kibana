import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
  KuiButton,
  KuiButtonIcon,
  KuiToolBarText,
  KuiControlledTable,
  KuiPager,
  KuiToolBarFooterSection,
  KuiToolBarFooter,
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
} from '../../../../components';

export class ControlledTableWithEmptyPrompt extends React.Component {
  getPager() {
    return (
      <KuiPager
        startNumber={1}
        hasNextPage={true}
        hasPreviousPage={false}
        endNumber={10}
        totalItems={100}
        onNextPage={() => {}}
        onPreviousPage={() => {}}
      />
    );
  }

  render() {
    return (
      <KuiControlledTable>
        <KuiToolBar>
          <KuiToolBarSearchBox onFilter={() => {}} />

          <KuiToolBarSection>
            <KuiButton buttonType="primary">
              Add
            </KuiButton>

            <KuiButton
              buttonType="basic"
              icon={<KuiButtonIcon type="settings" />}
            />

            <KuiButton
              buttonType="basic"
              icon={<KuiButtonIcon type="menu" />}
            />
          </KuiToolBarSection>

          <KuiToolBarSection>
            { this.getPager() }
          </KuiToolBarSection>
        </KuiToolBar>

        <KuiEmptyTablePromptPanel>
          <KuiEmptyTablePrompt
            actions={<KuiButton buttonType="primary">Add Items</KuiButton>}
            message="Uh oh you have no items!"
          />
        </KuiEmptyTablePromptPanel>

        <KuiToolBarFooter>
          <KuiToolBarFooterSection>
            <KuiToolBarText>
              5 Items selected
            </KuiToolBarText>
          </KuiToolBarFooterSection>

          <KuiToolBarFooterSection>
            <KuiToolBarText>
              1 &ndash; 20 of 33
            </KuiToolBarText>
            {
              this.getPager()
            }
          </KuiToolBarFooterSection>
        </KuiToolBarFooter>

      </KuiControlledTable>
    );
  }
}
