import React from 'react';

import {
  KuiTable,
  KuiTableRowCellLiner,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
} from '../../../../components';

export function TableWithMenuButtons() {
  return (
     <KuiTable>
        <thead>
          <tr>
            <KuiTableHeaderCell>
              Reminder
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              A
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              B
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              C
            </KuiTableHeaderCell>
            <KuiTableHeaderCell className="kuiTableHeaderCell--alignRight">
              Actions
            </KuiTableHeaderCell>
          </tr>
        </thead>

        <tbody>
          <KuiTableRow>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                Core temperature critical
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                A
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                B
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                C
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell className="kuiTableRowCell--alignRight">
              <KuiTableRowCellLiner>
                <div className="kuiMenuButtonGroup kuiMenuButtonGroup--alignRight">
                  <button className="kuiMenuButton kuiMenuButton--basic">
                    Acknowledge
                  </button>
                  <button className="kuiMenuButton kuiMenuButton--basic">
                    Silence
                  </button>
                  <button className="kuiMenuButton kuiMenuButton--danger">
                    Delete
                  </button>
                </div>
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
          </KuiTableRow>

          <KuiTableRow>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                Time for your snack
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                A
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                B
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                C
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell className="kuiTableRowCell--alignRight">
              <KuiTableRowCellLiner>
                <div className="kuiMenuButtonGroup kuiMenuButtonGroup--alignRight">
                  <button className="kuiMenuButton kuiMenuButton--basic">
                    Acknowledge
                  </button>
                  <button className="kuiMenuButton kuiMenuButton--basic">
                    Silence
                  </button>
                  <button className="kuiMenuButton kuiMenuButton--danger">
                    Delete
                  </button>
                </div>
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
          </KuiTableRow>
        </tbody>
      </KuiTable>
  );
}
