import _ from 'lodash';

/**
 * @typedef {Object} SortProperty
 * @property {string} sortProperty.name - Name of the property.
 * @property {function} sortProperty.getValue - A function that takes in an object and returns a value to sort
 * by.
 * @property {boolean} sortProperty.isAscending - The direction of the last sort by this property. Used to preserve
 * past sort orders.
 */

/**
 * Stores sort information for a set of SortProperties, including which property is currently being sorted on, as
 * well as the last sort order for each property.
 */
export class SortProperties {
  /**
   * @param {Array<SortProperty>} sortProperties - a set of sortable properties.
   * @param {string?} initialSortPropertyName - (Optional) Which sort property should be sorted on by default.
   */
  constructor(sortProperties, initialSortPropertyName) {
    this.sortProperties = sortProperties;
    /**
     * The current property that is being sorted on. Undefined if no sort order is applied.
     * @type {SortProperty|undefined}
     */
    this.currentSortedProperty = this.getSortPropertyByName(initialSortPropertyName);
  }

  /**
   * @returns {SortProperty} The current property that is being sorted on. Undefined if no sort order is applied.
   */
  getSortProperty() {
    return this.currentSortedProperty;
  }

  /**
   * Sorts the items passed in and returns a newly sorted array.
   * @param items {Array.<Object>}
   * @returns {Array.<Object>} sorted array of items, based off the sort properties.
   */
  sortItems(items) {
    return this.isAscending()
      ? _.sortBy(items, this.getSortProperty().getValue)
      : _.sortBy(items, this.getSortProperty().getValue).reverse();
  }

  /**
   * Returns the SortProperty with the given name, if found.
   * @param {String} propertyName
   * @returns {SortProperty|undefined}
   */
  getSortPropertyByName(propertyName) {
    return this.sortProperties.find(property => property.name === propertyName);
  }

  /**
   * Updates the sort property, potentially flipping the sort order based on whether the same
   * property was already being sorted.
   * @param propertyName {String}
   */
  sortOn(propertyName) {
    const newSortedProperty = this.getSortPropertyByName(propertyName);
    const sortProperty = this.getSortProperty();
    if (sortProperty && sortProperty.name === newSortedProperty.name) {
      this.flipAscending();
    } else {
      this.currentSortedProperty = newSortedProperty;
    }
  }

  /**
   * @returns {boolean} True if the current sort property is sorted in ascending order.
   */
  isAscending() {
    return this.currentSortedProperty ? this.currentSortedProperty.isAscending : false;
  }

  /**
   * Flips the current sorted property sort order.
   */
  flipAscending() {
    this.currentSortedProperty.isAscending = !this.currentSortedProperty.isAscending;
  }
}

