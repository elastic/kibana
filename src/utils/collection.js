
const set = Symbol('internal set');

module.exports = class Collection {
  constructor() { // Set's have a length of 0, mimic that
    this[set] = new Set(arguments[0] || []);
  }

  /******
   ** Collection API
   ******/

  toArray() {
    return [...this.values()];
  }

  toJSON() {
    return this.toArray();
  }

  /******
   ** ES Set Api
   ******/

  static get [Symbol.species]() {
    return Collection;
  }

  get size() {
    return this[set].size;
  }

  add(value) {
    return this[set].add(value);
  }

  clear() {
    return this[set].clear();
  }

  delete(value) {
    return this[set].delete(value);
  }

  entries() {
    return this[set].entries();
  }

  forEach(callbackFn, thisArg) {
    return this[set].forEach(callbackFn, thisArg);
  }

  has(value) {
    return this[set].has(value);
  }

  keys() {
    return this[set].keys();
  }

  values() {
    return this[set].values();
  }

  [Symbol.iterator]() {
    return this[set][Symbol.iterator]();
  }
};
