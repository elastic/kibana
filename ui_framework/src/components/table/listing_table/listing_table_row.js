import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiTableRow,
  KuiTableRowCheckBoxCell,
} from '../';

export class KuiListingTableRow extends React.PureComponent {
  onSelectionChanged = () => {
    this.props.onSelectionChanged(this.props.row.id);
  };

  render() {
    const { row, isChecked } = this.props;
    return (
      <KuiTableRow>
        <KuiTableRowCheckBoxCell
          isChecked={isChecked}
          onChange={this.onSelectionChanged}
        />
        {row.cells}
      </KuiTableRow>
    );
  }
}

KuiListingTableRow.PropTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    cells: PropTypes.arrayOf(PropTypes.node),
  }).isRequired,
  onSelectionChanged: PropTypes.func.isRequired,
  isChecked: PropTypes.bool,
};
