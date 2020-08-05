/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';
import { UNIQUENESS_ENFORCING_TYPES } from '../../common/constants/configuration_blocks';
import { BeatTag } from '../../common/domain_types';
import { CMBeatsAdapter } from './adapters/beats/adapter_types';
import { ConfigurationBlockAdapter } from './adapters/configuration_blocks/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';

export class CMTagsDomain {
  constructor(
    private readonly adapter: CMTagsAdapter,
    private readonly configurationBlocksAdapter: ConfigurationBlockAdapter,
    private readonly beatsAdabter: CMBeatsAdapter
  ) {}

  public async getAll(user: FrameworkUser, ESQuery?: any): Promise<BeatTag[]> {
    const tags = await this.adapter.getAll(user, ESQuery);
    return tags;
  }

  public async getWithIds(user: FrameworkUser, tagIds: string[]): Promise<BeatTag[]> {
    const tags = await this.adapter.getTagsWithIds(user, tagIds);
    return tags;
  }

  public async delete(user: FrameworkUser, tagIds: string[]) {
    const beats = await this.beatsAdabter.getAllWithTags(user, tagIds);
    if (beats.filter((b) => b.active).length > 0) {
      return false;
    }
    await this.configurationBlocksAdapter.deleteForTags(user, tagIds);
    return await this.adapter.delete(user, tagIds);
  }

  public async getNonConflictingTags(user: FrameworkUser, existingTagIds: string[]) {
    const tags = await this.adapter.getTagsWithIds(user, existingTagIds);
    const existingUniqueBlockTypes = uniq(
      tags.reduce((existingUniqueTypes, tag) => {
        if (tag.hasConfigurationBlocksTypes) {
          existingUniqueTypes = existingUniqueTypes.concat(tag.hasConfigurationBlocksTypes);
        }
        return existingUniqueTypes;
      }, [] as string[])
    ).filter((type) => UNIQUENESS_ENFORCING_TYPES.includes(type));

    const safeTags = await this.adapter.getWithoutConfigTypes(user, existingUniqueBlockTypes);
    return safeTags;
  }

  public async upsertTag(user: FrameworkUser, tag: BeatTag): Promise<string> {
    const tagId = await this.adapter.upsertTag(user, tag);

    return tagId;
  }
}
