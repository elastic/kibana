import React from 'react';
import _ from 'lodash';

import { KuiTr } from '../index';
import { columnPropType } from './column_prop_type';

export function ItemTableRow({ item, columns }) {
  const cells = _.map(columns, (column) => column.getRowCell(item));
  return <KuiTr>{cells}</KuiTr>;
}

ItemTableRow.propTypes = {
  item: React.PropTypes.any.isRequired,
  columns: React.PropTypes.arrayOf(columnPropType)
};
