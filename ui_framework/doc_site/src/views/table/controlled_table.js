import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
  KuiButton,
  KuiButtonIcon,
  KuiTable,
  KuiToolBarText,
  KuiControlledTable,
  KuiTableRowCellLiner,
  KuiPager,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableRowCheckBoxCell,
  KuiTableHeaderCell,
  KuiToolBarFooterSection,
  KuiToolBarFooter,
  KuiTableHeaderCheckBoxCell,
  KuiTableBody,
  KuiTableHeader,
} from '../../../../components';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT
} from '../../../../services';

// Arbitrarily use the 3rd index in the sample data as the unique identifier for handling checkbox toggling.
const CELL_ID_INDEX = 3;

export class ControlledTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItems: []
    };

    this.rows = [
      [
        <a className="kuiLink" href="#">Alligator</a>,
        <div className="kuiIcon kuiIcon--success fa-check"></div>,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '1'
      ],
      [
        <a className="kuiLink" href="#">Boomerang</a>,
        <div className="kuiIcon kuiIcon--success fa-check"></div>,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '10'
      ],
      [
        <a className="kuiLink" href="#">Celebration</a>,
        <div className="kuiIcon kuiIcon--warning fa-bolt"></div>,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '100'
      ],
      [
        <a className="kuiLink" href="#">Dog</a>,
        <div className="kuiIcon kuiIcon--error fa-warning"></div>,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '1000'
      ]
    ];
  }

  renderPager() {
    return (
      <KuiPager
        startNumber={ 1 }
        hasNextPage={ true }
        hasPreviousPage={ false }
        endNumber={ 10 }
        totalItems={ 100 }
        onNextPage={ () => {} }
        onPreviousPage={ () => {} }
      />
    );
  }

  deselectAll = () => {
    this.setState({ selectedItems: [] });
  };

  selectAll = () => {
    this.setState({ selectedItems: this.rows.map(item => item[CELL_ID_INDEX]) });
  };

  toggleAll = () => {
    if (this.areAllItemsChecked()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  };

  toggleItem = (item) => {
    if (this.isItemChecked(item)) {
      const index = this.state.selectedItems.indexOf(item[CELL_ID_INDEX]);
      this.setState((prevState) => {
        const arrayCopy = prevState.selectedItems.slice(0);
        arrayCopy.splice(index, 1);
        return {
          selectedItems: arrayCopy
        };
      });
    } else {
      this.setState((prevState) => ({
        selectedItems: prevState.selectedItems.concat([item[CELL_ID_INDEX]])
      }));
    }
  };

  isItemChecked = (item) => {
    return this.state.selectedItems.indexOf(item[CELL_ID_INDEX]) !== -1;
  };

  areAllItemsChecked = () => {
    return this.getSelectedItemsCount() === this.rows.length;
  };

  getSelectedItemsCount = () => {
    return this.state.selectedItems.length;
  };
  renderTableRows() {
    return this.rows.map(rowData => {
      return (
        <KuiTableRow>
          <KuiTableRowCheckBoxCell isChecked={ this.isItemChecked(rowData) } onChange={ () => this.toggleItem(rowData) }/>
          {
            rowData.map((cellData, index) => {
              const align = index === rowData.length - 1 ? RIGHT_ALIGNMENT : LEFT_ALIGNMENT;
              return (
                <KuiTableRowCell align={ align }>
                  <KuiTableRowCellLiner>
                    { cellData }
                  </KuiTableRowCellLiner>
                </KuiTableRowCell>
              );
            })
          }
        </KuiTableRow>
      );
    });
  }

  render() {
    return (
      <KuiControlledTable>
        <KuiToolBar>
          <KuiToolBarSearchBox onFilter={ () => {} } />

          <KuiToolBarSection>
            <KuiButton buttonType="primary">
              Add
            </KuiButton>

            <KuiButton
              buttonType="basic"
              icon={<KuiButtonIcon type="settings" />} />

            <KuiButton
              buttonType="basic"
              icon={<KuiButtonIcon type="menu" />} />
          </KuiToolBarSection>

          <KuiToolBarSection>
            { this.renderPager() }
          </KuiToolBarSection>
        </KuiToolBar>

        <KuiTable>
          <KuiTableHeader>
            <KuiTableHeaderCheckBoxCell isChecked={ this.areAllItemsChecked() } onChange={ this.toggleAll }/>
            <KuiTableHeaderCell>
              Title
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              Status
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              Date created
            </KuiTableHeaderCell>
            <KuiTableHeaderCell className="kuiTableHeaderCell--alignRight">
              Orders of magnitude
            </KuiTableHeaderCell>
          </KuiTableHeader>

          <KuiTableBody>
          {
            this.renderTableRows()
          }
          </KuiTableBody>
        </KuiTable>

        <KuiToolBarFooter>
          <KuiToolBarFooterSection>
            <KuiToolBarText>
              5 Items selected
            </KuiToolBarText>
          </KuiToolBarFooterSection>

          <KuiToolBarFooterSection>
            {
              this.renderPager()
            }
          </KuiToolBarFooterSection>
        </KuiToolBarFooter>

      </KuiControlledTable>
    );
  }
}
