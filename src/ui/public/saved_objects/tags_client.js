import { findObjectByTitle } from './find_object_by_title';
import { DuplicateTitleError } from './errors';

const TAG_TYPE = 'tag';

export class TagsClient {
  constructor(savedObjectClient) {
    this.savedObjectClient = savedObjectClient;
  }

  async save(attributes, id, version) {
    const duplicates = await findObjectByTitle(this.savedObjectClient, TAG_TYPE, attributes.title);
    if (duplicates) {
      throw new DuplicateTitleError(`A tag with the title '${attributes.title}' already exists.`);
    }

    if (id) {
      return await this.savedObjectClient.update(TAG_TYPE, id, attributes, version);
    }

    return await this.savedObjectClient.create(TAG_TYPE, attributes);
  }

  async delete(ids) {
    ids = !Array.isArray(ids) ? [ids] : ids;

    const deletePromises = ids.map((id) => {
      return this.savedObjectClient.delete(TAG_TYPE, id);
    });

    return Promise.all(deletePromises);
  }

  find() {

  }
}
