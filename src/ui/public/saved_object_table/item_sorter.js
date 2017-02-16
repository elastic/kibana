import _ from 'lodash';
import { SortOrder } from 'ui_framework/components/table/sort_order';

export class ItemSorter {
  static getFlippedSortOrder(sortOrder) {
    return sortOrder === SortOrder.ASC
      ? SortOrder.DESC
      : SortOrder.ASC;
  }

  /**
   *
   * @param {Array.<Object>} items
   * @param {String} property Property to sort on.
   * @param {SortOrder} sortOrder
   * @returns {Array.<Object>} the sorted Items
   */
  static sortItems(items, property, sortOrder) {
    return sortOrder === SortOrder.ASC
        ? _.sortBy(items, property)
        : _.sortBy(items, property).reverse();
  }
}
