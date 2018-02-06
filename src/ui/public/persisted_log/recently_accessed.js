import { PersistedLog } from 'ui/persisted_log';

class RecentlyAccessed {
  constructor() {
    const historyOptions = {
      maxLength: 10,
      filterDuplicates: true
    };
    this.history = new PersistedLog('kibana.history.recentlyAccessed', historyOptions);
  }

  add(link, label) {
    const historyItem = {
      link: link,
      label: label
    };
    this.history.add(historyItem);
  }

  get() {
    return this.history.get();
  }
}

export const recentlyAccessed = new RecentlyAccessed();
