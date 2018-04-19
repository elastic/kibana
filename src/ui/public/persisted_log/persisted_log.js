import { uiModules } from '../modules';
import _ from 'lodash';
import { Storage } from '../storage';

const localStorage = new Storage(window.localStorage);

const defaultIsDuplicate = (oldItem, newItem) => {
  return _.isEqual(oldItem, newItem);
};

export class PersistedLog {
  constructor(name, options = {}, storage = localStorage) {
    this.name = name;
    this.maxLength = parseInt(options.maxLength, 10);
    this.filterDuplicates = options.filterDuplicates || false;
    this.isDuplicate = options.isDuplicate || defaultIsDuplicate;
    this.storage = storage;
    this.items = this.storage.get(this.name) || [];
    if (!isNaN(this.maxLength)) this.items = _.take(this.items, this.maxLength);
  }

  add(val) {
    if (val == null) {
      return this.items;
    }

    // remove any matching items from the stack if option is set
    if (this.filterDuplicates) {
      _.remove(this.items, (item) => {
        return this.isDuplicate(item, val);
      });
    }

    this.items.unshift(val);

    // if maxLength is set, truncate the stack
    if (!isNaN(this.maxLength)) this.items = _.take(this.items, this.maxLength);

    // persist the stack
    this.storage.set(this.name, this.items);
    return this.items;
  }

  get() {
    return _.cloneDeep(this.items);
  }
}

uiModules.get('kibana/persisted_log')
  .factory('PersistedLog', function () {
    return PersistedLog;
  });
