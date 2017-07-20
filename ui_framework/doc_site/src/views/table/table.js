/* eslint-disable */

// Hide all icons initially.
$('[data-sort-icon-ascending]').hide();
$('[data-sort-icon-descending]').hide();

const demoSortableColumns = $('[data-demo-sortable-column]');

if (!demoSortableColumns.length) {
  throw new Error('demoSortableColumns missing');
}

let sortedColumn;
let isSortAscending = true;

function sortColumn(column) {
  if (sortedColumn) {
    if (column === sortedColumn) {
      // If we clicked the currently selected one, then reverse the sort.
      isSortAscending = !isSortAscending;
    } else {
      // Otherwise, "deselect" the old column by hiding its icons.
      const $sortedColumn = $(sortedColumn);
      $sortedColumn.removeClass('tableHeaderCell-isSorted');
      const ascendingIcon = $sortedColumn.find('[data-sort-icon-ascending]');
      const descendingIcon = $sortedColumn.find('[data-sort-icon-descending]');

      if (!ascendingIcon.length) {
        throw new Error('ascendingIcon missing');
      }

      if (!descendingIcon.length) {
        throw new Error('descendingIcon missing');
      }

      ascendingIcon.hide();
      descendingIcon.hide();
    }
  }

  // Update the visual state of the sortedColumn.
  sortedColumn = column;
  const $sortedColumn = $(sortedColumn);
  $sortedColumn.addClass('tableHeaderCell-isSorted');

  const ascendingIcon = $(sortedColumn).find('[data-sort-icon-ascending]');
  const descendingIcon = $(sortedColumn).find('[data-sort-icon-descending]');

  if (!ascendingIcon.length) {
    throw new Error('ascendingIcon missing');
  }

  if (!descendingIcon.length) {
    throw new Error('descendingIcon missing');
  }

  if (isSortAscending) {
    ascendingIcon.show();
    descendingIcon.hide();
  } else {
    ascendingIcon.hide();
    descendingIcon.show();
  }
}

// Sort on the first column by default.
sortColumn(demoSortableColumns[0]);

$(demoSortableColumns).on('click', event => {
  sortColumn(event.currentTarget);
});

$(demoSortableColumns).on('mouseover', event => {
  const column = event.currentTarget;
  if (column !== sortedColumn) {
    const icon =
      isSortAscending
      ? $(column).find('[data-sort-icon-ascending]')
      : $(column).find('[data-sort-icon-descending]');
    icon.show();
  }
});

$(demoSortableColumns).on('mouseout', event => {
  const column = event.currentTarget;
  if (column !== sortedColumn) {
    const icon =
      isSortAscending
      ? $(column).find('[data-sort-icon-ascending]')
      : $(column).find('[data-sort-icon-descending]');
    icon.hide();
  }
});
