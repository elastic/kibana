import _ from 'lodash';

/**
 * @typedef {Object} SortProperty
 * @property {string} sortProperty.name - Name of the property.
 * @property {function} sortProperty.getValue - A function that takes in an object and returns a value to sort
 * by.
 * @property {boolean} sortProperty.isAscending -Indicates the initial sort order.
 */

/**
 * Stores sort information for a set of SortProperties, including which property is currently
 */
export class SortProperties {
  /**
   * @param sortProperties {Array<SortProperty>}
   */
  constructor(sortProperties) {
    this.sortProperties = sortProperties;
    this.currentSortedProperty = undefined;
  }

  /**
   * @returns {SortProperty} Current sorted property.
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


  getSortPropertyByName(propertyName) {
    return this.sortProperties.find(property => property.name === propertyName);
  }

  /**
   * Set which property is currently being sorted on.
   * @param propertyName {String}
   */
  setSortedPropertyByName(propertyName) {
    const newSortedProperty = this.getSortPropertyByName(propertyName);
    const sortProperty = this.getSortProperty();
    if (sortProperty && sortProperty.name === newSortedProperty.name) {
      this.flipAscending();
    } else {
      this.currentSortedProperty = newSortedProperty;
    }
  }

  /**
   * @returns {boolean} True if the current sort property is sorted ascending.
   */
  isAscending() {
    return this.currentSortedProperty ? this.currentSortedProperty.isAscending : false;
  }

  flipAscending() {
    this.currentSortedProperty.isAscending = !this.currentSortedProperty.isAscending;
  }
}

