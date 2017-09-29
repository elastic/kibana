import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiTableRow,
  KuiTableRowCheckBoxCell,
} from '../';

export class KuiListingTableRow extends React.PureComponent {
  onCheckChanged = () => {
    this.props.onCheckChanged(this.props.row.id);
  };

  render() {
    const { row, isChecked } = this.props;
    return (
      <KuiTableRow>
        <KuiTableRowCheckBoxCell
          isChecked={isChecked}
          onChange={this.onCheckChanged}
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
  onCheckChanged: PropTypes.func.isRequired,
  isChecked: PropTypes.bool,
};
