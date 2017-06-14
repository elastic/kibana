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
  KuiTableHeaderCell,
  KuiToolBarFooterSection,
  KuiToolBarFooter,
} from '../../../../components';

export class ControlledTable extends React.Component {
  getSampleRowData() {
    return [
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
      ],
    ];
  }

  getPager() {
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

  getTableRows() {
    return this.getSampleRowData().map(rowData => {
      return (
        <KuiTableRow>
        <KuiTableRowCell className="kuiTableRowCell--checkBox">
          <KuiTableRowCellLiner>
            <input type="checkbox" className="kuiCheckBox" />
          </KuiTableRowCellLiner>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <KuiTableRowCellLiner>
            { rowData[0] }
          </KuiTableRowCellLiner>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <KuiTableRowCellLiner>
            { rowData[1] }
          </KuiTableRowCellLiner>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <KuiTableRowCellLiner>
            { rowData[2] }
          </KuiTableRowCellLiner>
        </KuiTableRowCell>
        <KuiTableRowCell className="kuiTableRowCell--alignRight">
          <KuiTableRowCellLiner>
            { rowData[3] }
          </KuiTableRowCellLiner>
        </KuiTableRowCell>
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
            { this.getPager() }
          </KuiToolBarSection>
        </KuiToolBar>

        <KuiTable>
          <thead>
            <tr>
              <KuiTableHeaderCell className="kuiTableHeaderCell--checkBox">
                <input type="checkbox" className="kuiCheckBox" />
              </KuiTableHeaderCell>
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
            </tr>
          </thead>

          <tbody>
          {
            this.getTableRows()
          }
          </tbody>
        </KuiTable>

        <KuiToolBarFooter>
          <KuiToolBarFooterSection>
            <KuiToolBarText>
              5 Items selected
            </KuiToolBarText>
          </KuiToolBarFooterSection>

          <KuiToolBarFooterSection>
            {
              this.getPager()
            }
          </KuiToolBarFooterSection>
        </KuiToolBarFooter>

      </KuiControlledTable>
    );
  }
}
