import angular from 'angular';

/**
 *  The HashingStore is a wrapper around a browser store object
 *  that hashes the items added to it and stores them by their
 *  hash. This hash is then returned so that the item can be received
 *  at a later time.
 */
class HashingStore {
  constructor(createStorageHash, store) {
    this._createStorageHash = createStorageHash;
    this._store = store;
  }

  /**
   *  Determine if the passed value looks like a hash
   *
   *  @param {string} str
   *  @return {boolean}
   */
  isHash(str) {
    return String(str).indexOf(HashingStore.HASH_TAG) === 0;
  }

  /**
   *  Find the value stored for the given hash
   *
   *  @param {string} hash
   *  @return {any}
   */
  getItemAtHash(hash) {
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
  hashAndSetItem(object) {
    // The object may contain Angular $$ properties, so let's ignore them.
    const json = angular.toJson(object);
    const hash = this._getShortHash(json);
    this._store.setItem(hash, json);
    return hash;
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
    const fullHash = `${HashingStore.HASH_TAG}${this._createStorageHash(json)}`;

    let short;
    for (let i = 7; i < fullHash.length; i++) {
      short = fullHash.slice(0, i);
      const existing = this._store.getItem(short);
      if (existing === null || existing === json) break;
    }

    return short;
  }
}

HashingStore.HASH_TAG = 'h@';

export default HashingStore;
