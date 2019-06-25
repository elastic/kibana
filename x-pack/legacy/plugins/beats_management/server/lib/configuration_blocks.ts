/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UNIQUENESS_ENFORCING_TYPES } from '../../common/constants/configuration_blocks';
import { ConfigurationBlock } from '../../common/domain_types';
import { ConfigurationBlockAdapter } from './adapters/configuration_blocks/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMTagsDomain } from './tags';

export class ConfigurationBlocksLib {
  constructor(
    private readonly adapter: ConfigurationBlockAdapter,
    private readonly tags: CMTagsDomain
  ) {}

  public async getForTags(
    user: FrameworkUser,
    tagIds: string[],
    page: number = 0,
    size: number = 10
  ) {
    if ((page + 1) * size > 10000) {
      throw new Error('System error, too many results. To get all results, request page: -1');
    }

    const result = await this.adapter.getForTags(user, tagIds, page, size);

    return { ...result, error: null };
  }

  public async delete(user: FrameworkUser, ids: string[]) {
    return await this.adapter.delete(user, ids);
  }

  public async save(user: FrameworkUser, block: ConfigurationBlock) {
    const tags = await this.tags.getWithIds(user, [block.tag]);
    const tag = tags[0];

    if (!tag) {
      return {
        error: 'Invalid tag, tag not found',
      };
    }

    if (!tag.hasConfigurationBlocksTypes) {
      tag.hasConfigurationBlocksTypes = [];
    }

    if (
      !block.id &&
      UNIQUENESS_ENFORCING_TYPES.includes(block.type) &&
      tag.hasConfigurationBlocksTypes.some((type: string) =>
        UNIQUENESS_ENFORCING_TYPES.includes(type)
      )
    ) {
      return {
        error:
          'Block is of type that already exists on this tag, and only one config of this type can exist at a time on a beat. Config not saved',
      };
    }

    if (UNIQUENESS_ENFORCING_TYPES.includes(block.type)) {
      tag.hasConfigurationBlocksTypes.push(block.type);
      await this.tags.upsertTag(user, tag);
    }

    const ids = await this.adapter.create(user, [block]);
    return {
      success: true,
      blockID: ids[0],
    };
  }
}
