import { find } from 'lodash';

/**
 * Returns an object matching a given title
 *
 * @param savedObjectsClient {SavedObjectsClient}
 * @param type {string}
 * @param title {string}
 * @returns {Promise<SavedObject|undefined>}
 */
export function findObjectByTitle(savedObjectsClient, type, title) {
  if (!title) return Promise.resolve();

  // Elastic search will return the most relevant results first, which means exact matches should come
  // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
  return savedObjectsClient.find({
    type,
    perPage: 10,
    search: `"${title}"`,
    searchFields: ['title'],
    fields: ['title']
  }).then(response => {
    const match = find(response.savedObjects, (obj) => {
      return obj.get('title').toLowerCase() === title.toLowerCase();
    });

    return match;
  });
}
