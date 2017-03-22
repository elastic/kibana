import React from 'react';

/**
 * @typedef {Object} ColumnDefinition
 *
 * @property {string} id - Unique id to represent this column.
 * @property {function} getHeaderCell - A function that returns a react component for the table header cell.
 * @property {function} getRowCell - A function that takes an item and builds a react component for the table cell row.
 */
export const columnPropType = React.PropTypes.shape({
  id: React.PropTypes.String,
  getHeaderCell: React.PropTypes.func,
  getRowCell: React.PropTypes.func,
});
