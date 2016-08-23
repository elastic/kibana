import angular from 'angular';
import { sortBy } from 'lodash';
import { Sha256 } from 'ui/crypto';

import StubBrowserStorage from 'test_utils/stub_browser_storage';
import { LazyLruStore } from './lazy_lru_store';

const TAG = 'h@';

/**
 *  The HashingStore is a wrapper around a browser store object
 *  that hashes the items added to it and stores them by their
 *  hash. This hash is then returned so that the item can be received
 *  at a later time.
 */
export default class HashingStore {
  constructor({ store, createHash, maxItems } = {}) {
    this._store = store || window.sessionStorage;
    if (createHash) this._createHash = createHash;
  }

  /**
   *  Determine if the passed value looks like a hash
   *
   *  @param {string} hash
   *  @return {boolean}
   */
  isHash(hash) {
    return String(hash).slice(0, TAG.length) === TAG;
  }

  /**
   *  Find the value stored for the given hash
   *
   *  @param {string} hash
   *  @return {any}
   */
  lookup(hash) {
    try {
      return JSON.parse(this._store.getItem(hash));
    } catch (err) {
      return null;
    }
  }

  /**
   *  Compute the hash of an object, store the object, and return
   *  the hash
   *
   *  @param {any} the value to hash
   *  @return {string} the hash of the value
   */
  add(object) {
    const json = angular.toJson(object);
    const hash = this._getShortHash(json);
    this._store.setItem(hash, json);
    return hash;
  }

  /**
   *  Remove a value identified by the hash from the store
   *
   *  @param {string} hash
   *  @return {undefined}
   */
  remove(hash) {
    this._store.removeItem(hash);
  }

  // private api

  /**
   *  calculate the full hash of a json object
   *
   *  @private
   *  @param {string} json
   *  @return {string} hash
   */
  _createHash(json) {
    return new Sha256().update(json, 'utf8').digest('hex');
  }

  /**
   *  Calculate the full hash for a json blob and then shorten in until
   *  it until it doesn't collide with other short hashes in the store
   *
   *  @private
   *  @param {string} json
   *  @param {string} shortHash
   */
  _getShortHash(json) {
    const fullHash = `${TAG}${this._createHash(json)}`;

    let short;
    for (let i = 7; i < fullHash.length; i++) {
      short = fullHash.slice(0, i);
      const existing = this._store.getItem(short);
      if (existing === null || existing === json) break;
    }

    return short;
  }
}
