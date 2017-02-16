import React from 'react';
import _ from 'lodash';

import { ItemTableRow } from './item_table_row';
import { KuiTable, KuiTBody, KuiTr, KuiTHead } from '../kui_table';

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

/**
 * @typedef {Object} ColumnDefinition
 *
 * @property {string} id - Unique id to represent this column.
 * @property {function} getHeaderCell - A function that returns a react component for the table header cell.
 * @property {function} getRowCell - A function that takes an item and builds a react component for the table cell row.
 */

ItemTable.propTypes = {
  items: React.PropTypes.array.isRequired,
  /**
   * @type columns {Array.<ColumnDefinition>}
   */
  columns: React.PropTypes.any.isRequired
};
