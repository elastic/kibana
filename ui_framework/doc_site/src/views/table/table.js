import React, {
  Component,
} from 'react';

import {
  KuiIcon,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
} from '../../../../components';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '../../../../services';

export class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rowIndexToSelectedMap: {
        2: true,
      },
    };

    this.rows = [{
      children: [
        <span>A very long line which will not wrap on narrower screens and instead will become truncated and replaced by an ellipsis</span>,
        <KuiIcon type="user" size="medium" />,
        <span>Tue Dec 06 2016 12:56:15 GMT-0800 (PST)</span>,
        <span>1</span>,
      ],
    }, {
      children: [
        <span>A very long line which will wrap on narrower screens and <em>not</em> become truncated and replaced by an ellipsis</span>,
        <KuiIcon type="user" size="medium" />,
        <span>Tue Dec 06 2016 12:56:15 GMT-0800 (PST)</span>,
        <span>1</span>,
      ],
      wrapText: true,
    }, {
      children: [
        <a className="kuiLink" href="#">Boomerang</a>,
        <KuiIcon type="user" size="medium" />,
        <span>Tue Dec 06 2016 12:56:15 GMT-0800 (PST)</span>,
        <span>10</span>,
      ],
      isSelected: true,
    }, {
      children: [
        <a className="kuiLink" href="#">Celebration</a>,
        <KuiIcon type="user" size="medium" />,
        <span>Tue Dec 06 2016 12:56:15 GMT-0800 (PST)</span>,
        <span>100</span>,
      ],
    }, {
      children: [
        <a className="kuiLink" href="#">Dog</a>,
        <KuiIcon type="user" size="medium" />,
        <span>Tue Dec 06 2016 12:56:15 GMT-0800 (PST)</span>,
        <span>1000</span>,
      ],
    }];

    this.columns = [{
      label: 'Title',
      alignment: LEFT_ALIGNMENT,
    }, {
      label: 'Type',
      alignment: LEFT_ALIGNMENT,
      width: '60px',
    }, {
      label: 'Date created',
      alignment: LEFT_ALIGNMENT,
    }, {
      label: 'Orders of magnitude',
      alignment: RIGHT_ALIGNMENT,
    }];
  }

  renderHeaderCells() {
    return this.columns.map((column, columnIndex) => (
      <KuiTableHeaderCell
        key={columnIndex}
        align={this.columns[columnIndex].alignment}
        width={column.width}
      >
        {column.label}
      </KuiTableHeaderCell>
    ));
  }

  renderTableRows() {
    return this.rows.map((row, rowIndex) => {
      const cells = row.children.map((cell, cellIndex) => {
        return (
          <KuiTableRowCell
            key={cellIndex}
            align={this.columns[cellIndex].alignment}
            wrapText={row.wrapText}
          >
            {cell}
          </KuiTableRowCell>
        );
      });

      return (
        <KuiTableRow
          isSelected={this.state.rowIndexToSelectedMap[rowIndex]}
          key={rowIndex}
        >
          {cells}
        </KuiTableRow>
      );
    });
  }

  render() {
    return (
      <KuiTable>
        <KuiTableHeader>
          {this.renderHeaderCells()}
        </KuiTableHeader>

        <KuiTableBody>
          {this.renderTableRows()}
        </KuiTableBody>
      </KuiTable>
    );
  }
}
