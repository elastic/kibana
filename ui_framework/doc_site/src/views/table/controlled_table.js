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

export class ControlledTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rowToSelectedStateMap: new Map(),
    };

    this.rows = [
      [
        <a className="kuiLink" href="#">Alligator</a>,
        <div className="kuiIcon kuiIcon--success fa-check" />,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '1'
      ],
      [
        <a className="kuiLink" href="#">Boomerang</a>,
        <div className="kuiIcon kuiIcon--success fa-check" />,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '10'
      ],
      [
        <a className="kuiLink" href="#">Celebration</a>,
        <div className="kuiIcon kuiIcon--warning fa-bolt" />,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '100'
      ],
      [
        <a className="kuiLink" href="#">Dog</a>,
        <div className="kuiIcon kuiIcon--error fa-warning" />,
        'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
        '1000'
      ]
    ];
  }

  renderPager() {
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

  toggleItem = (item) => {
    this.setState(previousState => {
      const rowToSelectedStateMap = new Map(previousState.rowToSelectedStateMap);
      rowToSelectedStateMap.set(item, !rowToSelectedStateMap.get(item));
      return { rowToSelectedStateMap };
    });
  };

  isItemChecked = (item) => {
    return this.state.rowToSelectedStateMap.get(item);
  };

  renderTableRows() {
    return this.rows.map((rowData, rowIndex) => {
      return (
        <KuiTableRow key={rowIndex}>
          <KuiTableRowCheckBoxCell
            isChecked={this.isItemChecked(rowData)}
            onChange={() => this.toggleItem(rowData)}
          />
          {
            rowData.map((cellData, index) => {
              const align = index === rowData.length - 1 ? RIGHT_ALIGNMENT : LEFT_ALIGNMENT;
              return (
                <KuiTableRowCell align={align} key={index}>
                  { cellData }
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
            { this.renderPager() }
          </KuiToolBarSection>
        </KuiToolBar>

        <KuiTable>
          <KuiTableHeader>
            <KuiTableHeaderCheckBoxCell
              isChecked={this.isItemChecked('header')}
              onChange={() => this.toggleItem('header')}
            />
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
