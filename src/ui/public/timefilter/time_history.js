import moment from 'moment';
import { PersistedLog } from '../persisted_log';
import { TIME_MODES } from '../timepicker/modes';

class TimeHistory {
  constructor() {
    const historyOptions = {
      maxLength: 10,
      filterDuplicates: true
    };
    this.history = new PersistedLog('kibana.timepicker.timeHistory', historyOptions);
  }

  add(time) {
    if (!time) {
      return;
    }

    // time from/to can be strings or moment objects - convert to strings so always dealing with same types
    const justStringsTime = {
      from: moment.isMoment(time.from) ? time.from.toISOString() : time.from,
      mode: TIME_MODES.RECENT,
      to: moment.isMoment(time.to) ? time.to.toISOString() : time.to
    };
    this.history.add(justStringsTime);
  }

  get() {
    return this.history.get();
  }
}

export const timeHistory = new TimeHistory();
