import _ from 'lodash';

/**
 * @typedef {Object} SortableProperty
 * @property {string} sortableProperty.name - Name of the property.
 * @property {function} sortableProperty.getValue - A function that takes in an object and returns a value to sort
 * by.
 * @property {boolean} sortableProperty.isAscending - The direction of the last sort by this property. Used to preserve
 * past sort orders.
 */

/**
 * Stores sort information for a set of SortableProperties, including which property is currently being sorted on, as
 * well as the last sort order for each property.
 */
export class SortableProperties {
  /**
   * @param {Array<SortableProperty>} sortableProperties - a set of sortable properties.
   * @param {string} initialSortablePropertyName - Which sort property should be sorted on by default.
   */
  constructor(sortableProperties, initialSortablePropertyName) {
    this.sortableProperties = sortableProperties;
    /**
     * The current property that is being sorted on.
     * @type {SortableProperty}
     */
    this.currentSortedProperty = this.getSortablePropertyByName(initialSortablePropertyName);
    if (!this.currentSortedProperty) {
      throw new Error(`No property with the name ${initialSortablePropertyName}`);
    }
  }

  /**
   * @returns {SortableProperty} The current property that is being sorted on. Undefined if no sort order is applied.
   */
  getSortedProperty() {
    return this.currentSortedProperty;
  }

  /**
   * Sorts the items passed in and returns a newly sorted array.
   * @param items {Array.<Object>}
   * @returns {Array.<Object>} sorted array of items, based off the sort properties.
   */
  sortItems(items) {
    return this.isCurrentSortAscending()
      ? _.sortBy(items, this.getSortedProperty().getValue)
      : _.sortBy(items, this.getSortedProperty().getValue).reverse();
  }

  /**
   * Returns the SortProperty with the given name, if found.
   * @param {String} propertyName
   * @returns {SortableProperty|undefined}
   */
  getSortablePropertyByName(propertyName) {
    return this.sortableProperties.find(property => property.name === propertyName);
  }

  /**
   * Updates the sort property, potentially flipping the sort order based on whether the same
   * property was already being sorted.
   * @param propertyName {String}
   */
  sortOn(propertyName) {
    const newSortedProperty = this.getSortablePropertyByName(propertyName);
    const sortedProperty = this.getSortedProperty();
    if (sortedProperty.name === newSortedProperty.name) {
      this.flipCurrentSortOrder();
    } else {
      this.currentSortedProperty = newSortedProperty;
    }
  }

  /**
   * @returns {boolean} True if the current sortable property is sorted in ascending order.
   */
  isCurrentSortAscending() {
    const sortedProperty = this.getSortedProperty();
    return sortedProperty ? this.isAscendingByName(sortedProperty.name) : false;
  }

  /**
   * @param {string} propertyName
   * @returns {boolean} True if the given sort property is sorted in ascending order.
   */
  isAscendingByName(propertyName) {
    const sortedProperty = this.getSortablePropertyByName(propertyName);
    return sortedProperty ? sortedProperty.isAscending : false;
  }

  /**
   * Flips the current sorted property sort order.
   */
  flipCurrentSortOrder() {
    this.currentSortedProperty.isAscending = !this.currentSortedProperty.isAscending;
  }
}

