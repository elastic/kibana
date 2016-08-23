import { sortBy } from 'lodash';

import Notifier from 'ui/notify/notifier';

/**
 *  The maximum number of times that we will try to
 *  clear space after a call to setItem on the store fails
 *
 *  @type {Number}
 */
const DEFAULT_MAX_SET_ATTEMPTS = 3;

/**
 *  When trying to clear enough space for a key+chunk,
 *  multiply the necessary space by this to produce the
 *  "ideal" amount of space to clear.
 *
 *  By clearing the "ideal" amount instead of just the
 *  necessary amount we prevent extra calls cleanup calls.
 *
 *  The "ideal" amount is limited by the MAX_IDEAL_CLEAR_PERCENT
 *
 *  @type {Number}
 */
const DEFAULT_IDEAL_CLEAR_RATIO = 100;

/**
 *  A limit to the amount of space that can be cleared
 *  by the inflation caused by the IDEAL_CLEAR_RATIO
 *  @type {Number}
 */
const DEFAULT_MAX_IDEAL_CLEAR_PERCENT = 0.3;

export default class LazyLruStore {
  constructor(opts = {}) {
    const {
      id,
      store,
      notify = new Notifier(`LazyLruStore (re: probably history hashing)`),
      maxItems = Infinity,
      maxSetAttempts = DEFAULT_MAX_SET_ATTEMPTS,
      idealClearRatio = DEFAULT_IDEAL_CLEAR_RATIO,
      maxIdealClearPercent = DEFAULT_MAX_IDEAL_CLEAR_PERCENT,
    } = opts;

    if (!id) throw new TypeError('id is required');
    if (!store) throw new TypeError('store is required');
    if (maxSetAttempts < 1) throw new TypeError('maxSetAttempts must be >= 1');
    if (idealClearRatio < 1) throw new TypeError('idealClearRatio must be >= 1');
    if (maxIdealClearPercent < 0 || maxIdealClearPercent > 1) {
      throw new TypeError('maxIdealClearPercent must be between 0 and 1');
    }

    this._id = id;
    this._prefix = `lru:${this._id}:`;
    this._store = store;
    this._notify = notify;
    this._maxItems = maxItems;
    this._itemCountGuess = this._getItemCount();
    this._maxSetAttempts = maxSetAttempts;
    this._idealClearRatio = idealClearRatio;
    this._maxIdealClearPercent = maxIdealClearPercent;

    this._verifyMaxItems();
  }

  getItem(key) {
    const chunk = this._store.getItem(this._getStoreKey(key));
    if (chunk === null) return null;
    const { val } = this._parseChunk(chunk);
    return val;
  }

  setItem(key, val) {
    const newKey = !this._storeHasKey(key);
    this._attemptToSet(this._getStoreKey(key), this._getChunk(val));
    if (newKey) this._itemCountGuess += 1;
    this._verifyMaxItems();
  }

  removeItem(key) {
    if (!this._storeHasKey(key)) return;
    this._store.removeItem(this._getStoreKey(key));
    this._itemCountGuess -= 1;
    this._verifyMaxItems();
  }

  getStorageOverhead() {
    return (this._getStoreKey('') + this._getChunk('')).length;
  }

  // private api

  _getStoreKey(key) {
    return `${this._prefix}${key}`;
  }

  _storeHasKey(key) {
    return this._store.getItem(this._getStoreKey(key)) !== null;
  }

  /**
   *  Convert a JSON blob into a chunk, the wrapper around values
   *  that tells us when they were last stored
   *
   *  @private
   *  @param {string} val
   *  @return {string} chunk
   */
  _getChunk(val) {
    return `${Date.now()}/${val}`;
  }

  /**
   *  Parse a chunk into it's store time and val values
   *
   *  @private
   *  @param {string} the chunk, probably read from the store
   *  @return {object} parsed
   *  @property {number} parsed.time
   *  @property {string} parsed.val
   */
  _parseChunk(chunk) {
    const splitIndex = chunk.indexOf('/');
    const time = parseInt(chunk.slice(0, splitIndex), 10);
    const val = chunk.slice(splitIndex + 1);
    return { time, val };
  }

  /**
   *  Attempt to a set a key on the store, if the setItem call
   *  fails then the assumption is that the store is out of space
   *  so we call this._makeSpaceFor(key, chunk). If this call
   *  reports that enough space for the key and chunk were cleared,
   *  then this function will call itself again, this time sending
   *  attempt + 1 as the attempt number. If this loop continues
   *  and attempt meets or exceeds the this._maxSetAttempts then a fatal
   *  error will be sent to notify, as the users session is no longer
   *  usable.
   *
   *  @private
   *  @param {string} key
   *  @param {string} chunk
   *  @param {number} [attempt=1]
   */
  _attemptToSet(key, chunk, attempt = 1) {
    try {
      this._store.setItem(key, chunk);
    } catch (error) {
      if (attempt >= this._maxSetAttempts) {
        throw error;
      }

      const madeEnoughSpace = this._makeSpaceFor(key, chunk);
      if (madeEnoughSpace) {
        this._attemptToSet(key, chunk, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   *  Walk all items in the store to find items stored using the same
   *  this._prefix. Collect the time that key was last set, and the
   *  byte-size of that item, and report all values found along
   *  with the total bytes
   *
   *  @private
   *  @return {object} index
   *  @property {object[]} index.itemsByOldestAccess
   *  @property {number} index.totalBytes
   */
  _indexStoredItems() {
    const store = this._store;
    const notify = this._notify;

    const items = [];
    let totalBytes = 0;

    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);

      if (key.slice(0, this._prefix.length) !== this._prefix) {
        continue;
      }

      const chunk = store.getItem(key);
      const { time } = this._parseChunk(chunk);
      const bytes = key.length + chunk.length;
      items.push({ key, time, bytes });
      totalBytes += bytes;
    }

    const itemsByOldestAccess = sortBy(items, 'time');
    return { itemsByOldestAccess, totalBytes };
  }

  _getItemCount() {
    const { itemsByOldestAccess } = this._indexStoredItems();
    return itemsByOldestAccess.length;
  }

  /**
   *  Check that the itemCountGuess has not exceeded the maxItems,
   *  if it has, trim the item list to meet the maxItem count
   */
  _verifyMaxItems() {
    if (this._maxItems > this._itemCountGuess) return;

    const { itemsByOldestAccess } = this._indexStoredItems();
    // update our guess to make sure it's accurate
    this._itemCountGuess = itemsByOldestAccess.length;
    // remove all items from the beginning of the list, leaving this._maxItems in the list
    itemsByOldestAccess
      .slice(0, -this._maxItems)
      .forEach(item => this._doItemAutoRemoval(item));
  }

  /**
   *  Determine how much space to clear so that we can store the specified
   *  key and chunk into the store. Then clear that data and return true of
   *  false if we were successfull
   *
   *  @private
   *  @param {string} key
   *  @param {string} chunk
   *  @return {boolean} success
   */
  _makeSpaceFor(key, chunk) {
    const notify = this._notify;
    return notify.event(`trying to make room in lru ${this._id}`, () => {
      const { totalBytes, itemsByOldestAccess } = this._indexStoredItems();

      // pick how much space we are going to try to clear
      // by finding a value that is at least the size of
      // the key + chunk but up to the key + chunk * IDEAL_CLEAR_RATIO
      const freeMin = key.length + chunk.length;
      const freeIdeal = freeMin * this._idealClearRatio;
      const toClear = Math.max(freeMin, Math.min(freeIdeal, totalBytes * this._maxIdealClearPercent));
      notify.log(`PLAN: min ${freeMin} bytes, target ${toClear} bytes`);

      let remainingToClear = toClear;
      let removedItemCount = 0;
      while (itemsByOldestAccess.length > 0 && remainingToClear > 0) {
        const item = itemsByOldestAccess.shift();
        remainingToClear -= item.bytes;
        removedItemCount += 1;
        this._doItemAutoRemoval(item);
      }

      const success = remainingToClear <= 0;

      const label = success ? 'SUCCESS' : 'FAILURE';
      const removedBytes = toClear - remainingToClear;
      notify.log(`${label}: removed ${removedItemCount} items for ${removedBytes} bytes`);
      return success;
    });
  }

  /**
   *  Extracted helper for automated removal of items with logging
   *
   *  @private
   *  @param {object} item
   *  @property {string} item.key
   *  @property {number} item.time
   *  @property {number} item.bytes
   */
  _doItemAutoRemoval(item) {
    const timeString = new Date(item.time).toISOString();
    this._notify.log(`REMOVE: entry "${item.key}" from ${timeString}, freeing ${item.bytes} bytes`);
    this._store.removeItem(item.key);
    this._itemCountGuess -= 1;
  }
}
