import React from 'react';
import _ from 'lodash';

import { ItemTableRow } from './item_table_row';
import { KuiTable, KuiTBody, KuiTr, KuiTHead } from '../kui_table';
import { columnPropType } from './column_prop_type';

export function ItemTable({ items, columns }) {
  const columnsHeaderRow = _.map(columns, (column) => column.getHeaderCell());

  const rows =  _.map(items,(item) =>
    <ItemTableRow key={item.id} item={item} columns={columns} />
  );

  return (
      <KuiTable>
        <KuiTHead>
          <KuiTr>
            {columnsHeaderRow}
          </KuiTr>
        </KuiTHead>

        <KuiTBody>
          {rows}
        </KuiTBody>
      </KuiTable>
  );
}

ItemTable.propTypes = {
  items: React.PropTypes.array.isRequired,
  columns: React.PropTypes.arrayOf(columnPropType)
};
