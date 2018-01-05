import _ from 'lodash';
import moment from 'moment';
import { Storage } from 'ui/storage';
import { TIME_MODES } from 'ui/timepicker/modes';

const MAX_HISTORY = 20;
const TIME_HISTORY_KEY = 'kibana.timepicker.timeHistory';
const TIME_KEY = 'kibana.timepicker.time';
const REFRESH_INTERVAL_KEY = 'kibana.timepicker.refreshInterval';

class TimeHistory {
  constructor() {
    this.storage = new Storage(window.localStorage);
  }

  setRefreshInterval(refreshInterval) {
    if (!refreshInterval) {
      return;
    }

    this.storage.set(REFRESH_INTERVAL_KEY, refreshInterval);
  }

  getRefreshInterval(defaultRefreshValue) {
    const refreshInterval = this.storage.get(REFRESH_INTERVAL_KEY);
    if (!refreshInterval) {
      return defaultRefreshValue;
    }
    return refreshInterval;
  }

  setTime(time) {
    if (!time) {
      return;
    }

    // time from/to can be strings or moment objects - convert to strings so always dealing with same types
    const justStringsTime = {
      from: moment.isMoment(time.from) ? time.from.toISOString() : time.from,
      mode: time.mode,
      to: moment.isMoment(time.to) ? time.to.toISOString() : time.to
    };

    this.storage.set(TIME_KEY, justStringsTime);

    let timeHistory = this.storage.get(TIME_HISTORY_KEY);
    if (!timeHistory) {
      timeHistory = {
        [TIME_MODES.ABSOLUTE]: [],
        [TIME_MODES.RELATIVE]: [],
      };
    }
    if (!Object.keys(timeHistory).includes(justStringsTime.mode)) {
      return;
    }
    const noDuplicates = timeHistory[justStringsTime.mode].filter(t => {
      return !_.isEqual(t, justStringsTime);
    });
    noDuplicates.unshift(justStringsTime);
    if (noDuplicates.length >= MAX_HISTORY) {
      noDuplicates.length = MAX_HISTORY;
    }
    timeHistory[time.mode] = noDuplicates;
    this.storage.set(TIME_HISTORY_KEY, timeHistory);
  }

  getTimeHistory(timeMode) {
    const timeHistory = this.storage.get(TIME_HISTORY_KEY);
    if (!timeHistory || !Object.keys(timeHistory).includes(timeMode)) {
      return [];
    }

    return timeHistory[timeMode];
  }

  getTime(defaultTime) {
    const time = this.storage.get(TIME_KEY);
    if (!time) {
      return defaultTime;
    }
    return time;
  }
}

export const timeHistory = new TimeHistory();
