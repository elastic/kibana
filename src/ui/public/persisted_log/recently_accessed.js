import { PersistedLog } from './';

class RecentlyAccessed {
  constructor() {
    const historyOptions = {
      maxLength: 20,
      filterDuplicates: true,
      isDuplicate: (oldItem, newItem) => {
        return oldItem.id === newItem.id;
      }
    };
    this.history = new PersistedLog('kibana.history.recentlyAccessed', historyOptions);
  }

  add(link, label, id) {
    const historyItem = {
      link: link,
      label: label,
      id: id
    };
    this.history.add(historyItem);
  }

  get() {
    return this.history.get();
  }
}

export const recentlyAccessed = new RecentlyAccessed();
