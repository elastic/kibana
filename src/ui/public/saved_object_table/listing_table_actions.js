import { ItemSelectionActions } from './item_selection_actions';
import { SortOrder } from 'ui_framework/components';
import { sortItems, getFlippedSortOrder } from './sort_items';

export class ListingTableActions {
  static getInitialState() {
    return {
      items: [],
      selectedIds: [],
      currentPageIndex: 0,
      isFetchingItems: true,
      sortedColumn: undefined,
      sortOrder: SortOrder.ASC
    };
  }

  static startFetching() {
    return {
      isFetchingItems: true
    };
  }

  static endFetching() {
    return {
      isFetchingItems: false
    };
  }

  static turnToNextPage(state) {
    return {
      currentPageIndex: state.currentPageIndex + 1,
      selectedIds: [],
    };
  }

  static turnToPreviousPage(state) {
    return {
      currentPageIndex: state.currentPageIndex - 1,
      selectedIds: [],
    };
  }

  static onToggleItem(state, item) {
    return {
      selectedIds: ItemSelectionActions.toggleItem(state.selectedIds, item.id),
    };
  }

  static onToggleAll(state, pageOfItems) {
    const pageOfItemIds = pageOfItems.map(item => item.id);
    return {
      selectedIds: ItemSelectionActions.toggleAll(state.selectedIds, pageOfItemIds),
    };
  }

  static areAllItemsSelected(state, pageOfItems) {
    const pageOfItemIds = pageOfItems.map(item => item.id);
    return ItemSelectionActions.areAllItemIdsSelected(state.selectedIds, pageOfItemIds);
  }

  static setFilteredItems(state, items, lastPageIndex) {
    return {
      items,
      currentPageIndex: Math.min(state.currentPageIndex, lastPageIndex),
      selectedIds: [],
    };
  }

  static onSort(state, property) {
    const { sortedColumn, sortOrder, items } = state;
    const newSortOrder = sortedColumn === property ? getFlippedSortOrder(sortOrder) : SortOrder.ASC;

    return {
      sortedColumn: property,
      sortOrder: newSortOrder,
      selectedIds: [],
      items: sortItems(items, property, newSortOrder)
    };
  }

  static getSortOrderForColumn(state, column) {
    return state.sortedColumn === column ? state.sortOrder : SortOrder.NONE;
  }
}
