import { ContentReference } from "../../schemas";
import { ContentReferencesStore } from "../types";

const CONTENT_REFERENCE_ID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Creates a new ContentReferencesStore used for storing references (also known as citations)
 */
export const contentReferencesStoreFactory: () => ContentReferencesStore = () => {
  const store = new Map<string, ContentReference>();

  const add: ContentReferencesStore['add'] = (creator) => {
    const entry = creator({ id: generateInsecureId() });
    store.set(entry.id, entry);
    return entry;
  };

  const getStore: ContentReferencesStore['getStore'] = () => {
    return Object.fromEntries(store);
  };

  /**
   * Generates an ID that does not exist in the store yet. This is not cryptographically secure.
   * @param size Size of ID to generate
   * @returns
   */
  const generateInsecureId = (size = 5): string => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += CONTENT_REFERENCE_ID_ALPHABET.charAt(
        Math.floor(Math.random() * CONTENT_REFERENCE_ID_ALPHABET.length)
      );
    }
    if (store.has(id)) {
      return generateInsecureId(size + 1);
    }
    return id;
  };

  return {
    add,
    getStore,
  };
};