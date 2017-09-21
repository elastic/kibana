import React, {
  Component,
} from 'react';

import {
  KuiCheckbox,
  KuiIcon,
  KuiLink,
  KuiTable,
  KuiTableBody,
  KuiTableHeader,
  KuiTableHeaderCell,
  KuiTableHeaderCellCheckbox,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableRowCellCheckbox,
} from '../../../../components';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
  SortableProperties,
} from '../../../../services';

export class Table extends Component {
  constructor(props) {
    super(props);

    this.state = {
      itemIdToSelectedMap: {
        2: true,
      },
      sortedColumn: 'title',
    };

    this.items = [{
      id: 0,
      title: 'A very long line which will not wrap on narrower screens and instead will become truncated and replaced by an ellipsis',
      type: 'user',
      dateCreated: 'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 1,
    }, {
      id: 1,
      title: {
        value: 'A very long line which will wrap on narrower screens and NOT become truncated and replaced by an ellipsis',
        isWrapped: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 01 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 1,
    }, {
      id: 2,
      title: {
        value: 'Boomerang',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 28 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10,
    }, {
      id: 3,
      title: {
        value: 'Celebration',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 16 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 100,
    }, {
      id: 4,
      title: {
        value: 'Dog',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 13 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 1000,
    }, {
      id: 5,
      title: {
        value: 'Dragon',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 6,
      title: {
        value: 'Bear',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 7,
      title: {
        value: 'Dinosaur',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 8,
      title: {
        value: 'Spider',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 9,
      title: {
        value: 'Bugbear',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 10,
      title: {
        value: 'Bear',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 11,
      title: {
        value: 'Dinosaur',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 12,
      title: {
        value: 'Spider',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }, {
      id: 13,
      title: {
        value: 'Bugbear',
        isLink: true,
      },
      type: 'user',
      dateCreated: 'Tue Dec 11 2016 12:56:15 GMT-0800 (PST)',
      magnitude: 10000,
    }];

    this.sortableProperties = new SortableProperties([{
      name: 'title',
      getValue: item => item.title.toLowerCase(),
      isAscending: true,
    }, {
      name: 'dateCreated',
      getValue: item => item.dateCreated.toLowerCase(),
      isAscending: true,
    }, {
      name: 'magnitude',
      getValue: item => item.magnitude.toLowerCase(),
      isAscending: true,
    }], this.state.sortedColumn);

    this.columns = [{
      id: 'checkbox',
      isCheckbox: true,
      width: '20px',
    }, {
      id: 'title',
      label: 'Title',
      alignment: LEFT_ALIGNMENT,
      isSortable: true,
    }, {
      id: 'type',
      label: 'Type',
      alignment: LEFT_ALIGNMENT,
      width: '60px',
      cellProvider: cell => <KuiIcon type={cell} size="medium" />,
    }, {
      id: 'dateCreated',
      label: 'Date created',
      alignment: LEFT_ALIGNMENT,
      isSortable: true,
    }, {
      id: 'magnitude',
      label: 'Orders of magnitude',
      alignment: RIGHT_ALIGNMENT,
      isSortable: true,
    }];
  }

  onSort = prop => {
    this.sortableProperties.sortOn(prop);

    this.setState({
      sortedColumn: prop,
    });
  }

  toggleItem = itemId => {
    const newItemIdToSelectedMap = Object.assign({}, this.state.itemIdToSelectedMap, {
      [itemId]: !this.state.itemIdToSelectedMap[itemId],
    });

    this.setState({
      itemIdToSelectedMap: newItemIdToSelectedMap,
    });
  }

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();
    const newItemIdToSelectedMap = {};
    this.items.forEach(item => newItemIdToSelectedMap[item.id] = !allSelected);


    this.setState({
      itemIdToSelectedMap: newItemIdToSelectedMap,
    });
  }

  isItemSelected = itemId => {
    return this.state.itemIdToSelectedMap[itemId];
  }

  areAllItemsSelected = () => {
    const indexOfUnselectedItem = this.items.findIndex(item => !this.isItemSelected(item.id));
    return indexOfUnselectedItem === -1;
  }

  renderHeaderCells() {
    return this.columns.map((column, columnIndex) => {
      if (column.isCheckbox) {
        return (
          <KuiTableHeaderCellCheckbox
            key={column.id}
            width={column.width}
          >
            <KuiCheckbox
              id="selectAllCheckbox"
              checked={this.areAllItemsSelected()}
              onChange={this.toggleAll.bind(this)}
              type="inList"
            />
          </KuiTableHeaderCellCheckbox>
        );
      }

      return (
        <KuiTableHeaderCell
          key={column.id}
          align={this.columns[columnIndex].alignment}
          width={column.width}
          onSort={column.isSortable ? this.onSort.bind(this, column.id) : undefined}
          isSorted={this.state.sortedColumn === column.id}
          isSortAscending={this.sortableProperties.isAscendingByName(column.id)}
        >
          {column.label}
        </KuiTableHeaderCell>
      );
    });
  }

  renderRows() {
    return this.items.map(item => {
      const cells = this.columns.map(column => {
        const cell = item[column.id];

        let child;

        if (column.isCheckbox) {
          return (
            <KuiTableRowCellCheckbox key={column.id}>
              <KuiCheckbox
                id={`${item.id}-checkbox`}
                checked={this.isItemSelected(item.id)}
                onChange={this.toggleItem.bind(this, item.id)}
                type="inList"
              />
            </KuiTableRowCellCheckbox>
          );
        } else if (column.cellProvider) {
          child = column.cellProvider(cell);
        } else if (cell.isLink) {
          child = <KuiLink href="">{cell.value}</KuiLink>;
        } else if (cell.isWrapped) {
          child = cell.value;
        } else {
          child = cell;
        }

        return (
          <KuiTableRowCell
            key={column.id}
            align={column.alignment}
            wrapText={cell && cell.isWrapped}
          >
            {child}
          </KuiTableRowCell>
        );
      });

      return (
        <KuiTableRow
          key={item.id}
          isSelected={this.isItemSelected(item.id)}
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
          {this.renderRows()}
        </KuiTableBody>
      </KuiTable>
    );
  }
}
