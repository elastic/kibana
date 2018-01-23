import React from 'react';
import PropTypes from 'prop-types';

import _ from 'lodash';

import {
  KuiTableRow,
  KuiTableRowCell,
  KuiTableRowCheckBoxCell,
} from '../';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '../../../services';

export class KuiListingTableRow extends React.PureComponent {
  onSelectionChanged = () => {
    this.props.onSelectionChanged(this.props.row.id);
  };

  renderCells() {
    return this.props.row.cells.map((cell, index) => {
      let { content, ...props } = cell;
      if (React.isValidElement(cell) || !_.isObject(cell)) {
        props = [];
        content = cell;
      }
      return (
        <KuiTableRowCell
          key={index}
          {...props}
        >
          {content}
        </KuiTableRowCell>
      );
    });
  }

  render() {
    const { isSelected } = this.props;
    return (
      <KuiTableRow>
        <KuiTableRowCheckBoxCell
          isChecked={isSelected}
          onChange={this.onSelectionChanged}
        />
        {this.renderCells()}
      </KuiTableRow>
    );
  }
}

KuiListingTableRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    cells: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.shape({
          content: PropTypes.node,
          align: PropTypes.oneOf([LEFT_ALIGNMENT, RIGHT_ALIGNMENT]),
        })
      ],
      )),
  }).isRequired,
  onSelectionChanged: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};
