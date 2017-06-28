import React from 'react';

import {
  KuiTable,
  KuiTableRowCellLiner,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
} from '../../../../components';

export function FluidTable() {
  return (
     <KuiTable shrinkToContent={ true }>
        <thead>
          <tr>
            <KuiTableHeaderCell>
              System
            </KuiTableHeaderCell>
            <KuiTableHeaderCell>
              Action
            </KuiTableHeaderCell>
          </tr>
        </thead>

        <tbody>
          <KuiTableRow>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                Cryogenics
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                <select className="kuiSelect" defaultValue="on">
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="selfDestruct">Self-destruct</option>
                </select>
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
          </KuiTableRow>

          <KuiTableRow>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                Propellant
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                <select className="kuiSelect" defaultValue="on">
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="selfDestruct">Self-destruct</option>
                </select>
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
          </KuiTableRow>

          <KuiTableRow>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                Rockets
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
            <KuiTableRowCell>
              <KuiTableRowCellLiner>
                <select className="kuiSelect" defaultValue="off">
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="selfDestruct">Self-destruct</option>
                </select>
              </KuiTableRowCellLiner>
            </KuiTableRowCell>
          </KuiTableRow>
        </tbody>
      </KuiTable>
  );
}
