/**
 * The HashedItemStore associates JSON objects with states in browser history and persists these
 * objects in sessionStorage. We persist them so that when a tab is closed and re-opened, we can
 * retain access to the state objects referenced by the browser history.
 *
 * Because there is a limit on how much data we can put into sessionStorage, the HashedItemStore
 * will attempt to remove old items from storage once that limit is reached.
 *
 * -------------------------------------------------------------------------------------------------
 *
 * Consideration 1: We can't (easily) mirror the browser history
 *
 * If we use letters to indicate a unique state object, and numbers to represent the same state
 * occurring again (due to action by the user), a history could look like this:
 *
 * Old < - - - - - - - - > New
 * A1 | B1 | C1 | A2 | D1 | E1
 *
 * If the user navigates back to C1 and starts to create new states, persisted history states will
 * become inaccessible:
 *
 * Old < - - - - - - - - - - -> New
 * A1 | B1 | C1 | F1 | G1 | H1 | I1  (new history states)
 *                A2 | D1 | E1       (inaccessible persisted history states)
 *
 * Theoretically, we could build a mirror of the browser history. When the onpopstate event is
 * dispatched, we could determine whether we have gone back or forward in history. Then, when
 * a new state is persisted, we could delete all of the persisted items which are no longer
 * accessible. (Note that this would require reference-counting so that A isn't removed while D and
 * E are, since A would still have a remaining reference from A1).
 *
 * However, the History API doesn't allow us to read from the history beyond the current state. This
 * means that if a session is restored, we can't rebuild this browser history mirror.
 *
 * Due to this imperfect implementation, HashedItemStore ignores the possibility of inaccessible
 * history states. In the future, we could implement this history mirror and persist it in
 * sessionStorage too. Then, when restoring a session, we can just retrieve it from sessionStorage.
 *
 * -------------------------------------------------------------------------------------------------
 *
 * Consideration 2: We can't tell when we've hit the browser history limit
 *
 * Because some of our persisted history states may no longer be referenced by the browser history,
 * and we have no way of knowing which ones, we have no way of knowing whether we've persisted a
 * number of accessible states beyond the browser history length limit.
 *
 * More fundamentally, the browser history length limit is a browser implementation detail, so it
 * can change from browser to browser, or over time. Respecting this limit would introduce a lot of
 * (unnecessary?) complexity.
 *
 * For these reasons, HashedItemStore doesn't concern itself with this constraint.
 */

import { pull, sortBy } from 'lodash';

export default class HashedItemStore {

  /**
   * HashedItemStore uses objects called indexed items to refer to items that have been persisted
   * in sessionStorage. An indexed item is shaped {hash, touched}. The touched date is when the item
   * was last referenced by the browser history.
   */
  constructor(sessionStorage) {
    this._sessionStorage = sessionStorage;

    // Store indexed items in descending order by touched (oldest first, newest last). We'll use
    // this to remove older items when we run out of storage space.
    this._indexedItems = [];

    // Potentially restore a previously persisted index. This happens when
    // we re-open a closed tab.
    const persistedItemIndex = this._sessionStorage.getItem(HashedItemStore.PERSISTED_INDEX_KEY);
    if (persistedItemIndex) {
      this._indexedItems = sortBy(JSON.parse(persistedItemIndex) || [], 'touched');
    }
  }

  setItem(hash, item) {
    const isItemPersisted = this._persistItem(hash, item);

    if (isItemPersisted) {
      this._touchHash(hash);
    }

    return isItemPersisted;
  }

  getItem(hash) {
    const item = this._sessionStorage.getItem(hash);

    if (item !== null) {
      this._touchHash(hash);
    }

    return item;
  }

  _getIndexedItem(hash) {
    return this._indexedItems.find(indexedItem => indexedItem.hash === hash);
  }

  _persistItem(hash, item) {
    try {
      this._sessionStorage.setItem(hash, item);
      return true;
    } catch (e) {
      // If there was an error then we need to make some space for the item.
      if (this._indexedItems.length === 0) {
        // If there's nothing left to remove, then we've run out of space and we're trying to
        // persist too large an item.
        return false;
      }

      // We need to try to make some space for the item by removing older items (i.e. items that
      // haven't been accessed recently).
      this._removeOldestItem();

      // Try to persist again.
      return this._persistItem(hash, item);
    }
  }

  _removeOldestItem() {
    const oldestIndexedItem = this._indexedItems.shift();
    // Remove oldest item from storage.
    this._sessionStorage.removeItem(oldestIndexedItem.hash);
  }

  _touchHash(hash) {
    // Touching a hash indicates that it's been used recently, so it won't be the first in line
    // when we remove items to free up storage space.

    // either get or create an indexedItem
    const indexedItem = this._getIndexedItem(hash) || { hash };

    // set/update the touched time to now so that it's the "newest" item in the index
    indexedItem.touched =  Date.now();

    // ensure that the item is last in the index
    pull(this._indexedItems, indexedItem);
    this._indexedItems.push(indexedItem);

    // Regardless of whether this is a new or updated item, we need to persist the index.
    this._sessionStorage.setItem(
      HashedItemStore.PERSISTED_INDEX_KEY,
      JSON.stringify(this._indexedItems)
    );
  }
}

HashedItemStore.PERSISTED_INDEX_KEY = 'kbn.hashedItemsIndex.v1';
