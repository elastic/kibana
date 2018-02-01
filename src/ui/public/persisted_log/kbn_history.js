import { PersistedLog } from 'ui/persisted_log';

class KbnHistory {
  constructor() {
    const historyOptions = {
      maxLength: 10,
      filterDuplicates: true
    };
    this.history = new PersistedLog('kibana.history.recentlyAccessed', historyOptions);
  }

  add(link, label) {
    const now = new Date();
    const historyItem = {
      link: link,
      label: label,
      lastAccessed: now.toISOString()
    };
    this.history.add(historyItem);
  }

  get() {
    return this.history.get();
  }
}

export const kbnHistory = new KbnHistory();
