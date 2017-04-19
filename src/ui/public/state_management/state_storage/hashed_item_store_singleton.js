import { HashedItemStore } from './hashed_item_store';

export const HashedItemStoreSingleton = new HashedItemStore(window.sessionStorage);
