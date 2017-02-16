import React from 'react';
import _ from 'lodash';

import { KuiTr, KuiTd } from '../kui_table';

export function ItemTableRow({ item, columns }) {
  const cells = _.map(columns, (column) => column.getRowCell(item));
  return <KuiTr>{cells}</KuiTr>;
}

ItemTableRow.propTypes = {
  item: React.PropTypes.any.isRequired,
  /**
   * @type {Array.<ColumnDefinition>}
   */
  columns: React.PropTypes.array.isRequired
};
