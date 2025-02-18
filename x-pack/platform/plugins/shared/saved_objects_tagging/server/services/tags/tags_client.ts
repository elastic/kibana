/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  CreateTagOptions,
  ITagsClient,
  Tag,
  TagAttributes,
  TagSavedObject,
} from '../../../common/types';
import { tagSavedObjectTypeName } from '../../../common/constants';
import { TagValidationError } from './errors';
import { validateTag } from './validate_tag';
import { savedObjectToTag } from './utils';

interface TagsClientOptions {
  client: SavedObjectsClientContract;
}

export class TagsClient implements ITagsClient {
  private readonly soClient: SavedObjectsClientContract;
  private readonly type = tagSavedObjectTypeName;

  constructor({ client }: TagsClientOptions) {
    this.soClient = client;
  }

  public async create(attributes: TagAttributes, options?: CreateTagOptions) {
    const validation = validateTag(attributes);
    if (!validation.valid) {
      throw new TagValidationError('Error validating tag attributes', validation);
    }
    const raw = await this.soClient.create<TagAttributes>(this.type, attributes, options);
    return savedObjectToTag(raw);
  }

  public async update(id: string, attributes: TagAttributes) {
    const validation = validateTag(attributes);
    if (!validation.valid) {
      throw new TagValidationError('Error validating tag attributes', validation);
    }
    const raw = await this.soClient.update<TagAttributes>(this.type, id, attributes);
    return savedObjectToTag(raw as TagSavedObject); // all attributes are updated, this is not a partial
  }

  public async get(id: string) {
    const raw = await this.soClient.get<TagAttributes>(this.type, id);
    return savedObjectToTag(raw);
  }

  public async getAll() {
    const pitFinder = this.soClient.createPointInTimeFinder<TagAttributes>({
      type: this.type,
      perPage: 1000,
    });

    const results: TagSavedObject[] = [];
    for await (const response of pitFinder.find()) {
      results.push(...response.saved_objects);
    }
    await pitFinder.close();

    return results.map(savedObjectToTag);
  }

  public async findByName(
    name: string,
    { exact = false }: { exact?: boolean | undefined } = {}
  ): Promise<Tag | null> {
    const response = await this.soClient.find<TagAttributes>({
      type: this.type,
      search: name,
      searchFields: ['name'],
      perPage: 1000,
    });

    if (response.total === 0) {
      return null;
    }

    const tag = exact
      ? response.saved_objects.find((t) => t.attributes.name.toLowerCase() === name.toLowerCase())
      : response.saved_objects[0];

    return tag ? savedObjectToTag(tag) : null;
  }

  public async delete(id: string) {
    // `removeReferencesTo` security check is the same as a `delete` operation's, so we can use the scoped client here.
    // If that was to change, we would need to use the internal client instead. A FTR test is ensuring
    // that this behave properly even with only 'tag' SO type write permission.
    await this.soClient.removeReferencesTo(this.type, id);
    // deleting the tag after reference removal in case of failure during the first call.
    await this.soClient.delete(this.type, id);
  }
}
