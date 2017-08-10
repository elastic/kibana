import React from 'react';

import {
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableHeader,
  KuiTableBody,
} from '../../../../components';

export function FluidTable() {
  return (
    <KuiTable shrinkToContent={ true }>
      <KuiTableHeader>
        <KuiTableHeaderCell>
              System
        </KuiTableHeaderCell>
        <KuiTableHeaderCell>
              Action
        </KuiTableHeaderCell>
      </KuiTableHeader>

      <KuiTableBody>
        <KuiTableRow>
          <KuiTableRowCell>
              Cryogenics
          </KuiTableRowCell>
          <KuiTableRowCell>
            <select className="kuiSelect" defaultValue="on">
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="selfDestruct">Self-destruct</option>
            </select>
          </KuiTableRowCell>
        </KuiTableRow>

        <KuiTableRow>
          <KuiTableRowCell>
              Propellant
          </KuiTableRowCell>
          <KuiTableRowCell>
            <select className="kuiSelect" defaultValue="on">
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="selfDestruct">Self-destruct</option>
            </select>
          </KuiTableRowCell>
        </KuiTableRow>

        <KuiTableRow>
          <KuiTableRowCell>
              Rockets
          </KuiTableRowCell>
          <KuiTableRowCell>
            <select className="kuiSelect" defaultValue="off">
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="selfDestruct">Self-destruct</option>
            </select>
          </KuiTableRowCell>
        </KuiTableRow>
      </KuiTableBody>
    </KuiTable>
  );
}
