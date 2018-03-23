import { findObjectByTitle } from './find_object_by_title';
import { DuplicateTitleError } from './errors';

const TAG_TYPE = 'tag';

export class TagsClient {
  constructor(savedObjectsClient) {
    this.savedObjectsClient = savedObjectsClient;
  }

  async save(attributes, id, version) {
    const duplicate = await findObjectByTitle(this.savedObjectsClient, TAG_TYPE, attributes.title);
    if (duplicate && duplicate.id !== id) {
      throw new DuplicateTitleError(`A tag with the title '${attributes.title}' already exists.`);
    }

    if (id) {
      return await this.savedObjectsClient.update(TAG_TYPE, id, attributes, version);
    }

    return await this.savedObjectsClient.create(TAG_TYPE, attributes);
  }

  async delete(ids) {
    ids = !Array.isArray(ids) ? [ids] : ids;

    const deletePromises = ids.map((id) => {
      return this.savedObjectsClient.delete(TAG_TYPE, id);
    });

    await Promise.all(deletePromises);
  }

  async find(search, limit = 100) {
    const resp = await this.savedObjectsClient.find({
      type: TAG_TYPE,
      fields: ['title', 'color'],
      search: `${search}*`,
      search_fields: ['title'],
      perPage: limit,
    });
    return resp.savedObjects;
  }
}
