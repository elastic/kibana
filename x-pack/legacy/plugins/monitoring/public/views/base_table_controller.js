/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitoringViewBaseController } from './';
import { tableStorageGetter, tableStorageSetter } from 'plugins/monitoring/components/table';

/**
 * Class to manage common instantiation behaviors in a view controller
 * And add persistent state to a table:
 * - page index: in table pagination, which page are we looking at
 * - filter text: what filter was entered in the table's filter bar
 * - sortKey: which column field of table data is used for sorting
 * - sortOrder: is sorting ordered ascending or descending
 *
 * This is expected to be extended, and behavior enabled using super();
 */
export class MonitoringViewBaseTableController extends MonitoringViewBaseController {
  /**
   * Create a table view controller
   * - used by parent class:
   * @param {String} title - Title of the page
   * @param {Function} getPageData - Function to fetch page data
   * @param {Service} $injector - Angular dependency injection service
   * @param {Service} $scope - Angular view data binding service
   * @param {Boolean} options.enableTimeFilter - Whether to show the time filter
   * @param {Boolean} options.enableAutoRefresh - Whether to show the auto refresh control
   * - specific to this class:
   * @param {String} storageKey - the namespace that will be used to keep the state data in the Monitoring localStorage object
   *
   */
  constructor(args) {
    super(args);
    const { storageKey, $injector } = args;
    const storage = $injector.get('localStorage');

    const getLocalStorageData = tableStorageGetter(storageKey);
    const setLocalStorageData = tableStorageSetter(storageKey);
    const { pageIndex, filterText, sortKey, sortOrder } = getLocalStorageData(storage);

    this.pageIndex = pageIndex;
    this.filterText = filterText;
    this.sortKey = sortKey;
    this.sortOrder = sortOrder;

    this.onNewState = newState => {
      setLocalStorageData(storage, newState);
    };
  }
}
