/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { timefilter as timefilterDep } from 'ui/timefilter';
import { RefreshInterval } from 'src/legacy/ui/public/timefilter/timefilter';
import { TimeRange } from 'src/legacy/ui/public/timefilter/time_history';

const timefilterUpdate$ = new Subject();
const refreshIntervalUpdate$ = new Subject();

class MlTimefilter {
  constructor() {
    // listen for original timefilter emitted events
    timefilterDep.on('fetch', this.emitUpdate); // setTime or setRefreshInterval called
    timefilterDep.on('refreshIntervalUpdate', () => this.emitRefreshIntervalUpdate()); // setRefreshInterval called
  }

  emitUpdate() {
    timefilterUpdate$.next();
  }

  emitRefreshIntervalUpdate() {
    refreshIntervalUpdate$.next();
  }

  disableAutoRefreshSelector() {
    return timefilterDep.disableAutoRefreshSelector();
  }

  disableTimeRangeSelector() {
    return timefilterDep.disableTimeRangeSelector();
  }

  enableAutoRefreshSelector() {
    return timefilterDep.enableAutoRefreshSelector();
  }

  enableTimeRangeSelector() {
    return timefilterDep.enableTimeRangeSelector();
  }

  isAutoRefreshSelectorEnabled() {
    return timefilterDep.isAutoRefreshSelectorEnabled;
  }

  isTimeRangeSelectorEnabled() {
    return timefilterDep.isAutoRefreshSelectorEnabled;
  }

  getActiveBounds() {
    return timefilterDep.getActiveBounds();
  }

  getRefreshInterval() {
    return timefilterDep.getRefreshInterval();
  }

  getTime() {
    return timefilterDep.getTime();
  }

  off(event: string) {
    timefilterDep.off(event, this.emitRefreshIntervalUpdate);
  }

  // in timefilter dependency - 'fetch', 'refreshIntervalUpdate' emitted
  setRefreshInterval(interval: RefreshInterval) {
    timefilterDep.setRefreshInterval(interval);
  }
  // in timefilter dependency - 'fetch' is emitted
  setTime(time: TimeRange) {
    timefilterDep.setTime(time);
  }
  // consumer must call unsubscribe on return value
  subscribeToUpdates(callback: () => void) {
    return timefilterUpdate$.subscribe(callback);
  }
  // consumer must call unsubscribe on return value
  subscribeToRefreshIntervalUpdate(callback: () => void) {
    return refreshIntervalUpdate$.subscribe(callback);
  }

  stop() {
    // TODO: unsubscribe from all listeners in constructor
    timefilterDep.off('fetch', this.emitUpdate);
    // timefilterDep.off('refreshIntervalUpdate');
  }
}

export const timefilter = new MlTimefilter();
