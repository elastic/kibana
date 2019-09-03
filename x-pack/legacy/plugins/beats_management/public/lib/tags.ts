/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuidv4 from 'uuid/v4';
import { BeatTag, CMBeat } from '../../common/domain_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';
import { ElasticsearchLib } from './elasticsearch';

export class TagsLib {
  constructor(
    private readonly adapter: CMTagsAdapter,
    private readonly elasticsearch: ElasticsearchLib
  ) {}

  public async getTagsWithIds(tagIds: string[]): Promise<BeatTag[]> {
    if (tagIds.length === 0) {
      return [];
    }
    return await this.adapter.getTagsWithIds([...new Set(tagIds)]);
  }
  public async delete(tagIds: string[]): Promise<boolean> {
    return await this.adapter.delete([...new Set(tagIds)]);
  }

  // FIXME: This needs to be paginated https://github.com/elastic/kibana/issues/26022
  public async getAll(kuery?: string): Promise<BeatTag[]> {
    let ESQuery;
    if (kuery) {
      ESQuery = await this.elasticsearch.convertKueryToEsQuery(kuery);
    }

    return await this.adapter.getAll(ESQuery);
  }
  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    if (!tag.id) {
      tag.id = uuidv4();
    }
    return await this.adapter.upsertTag(tag);
  }

  public async getassignableTagsForBeats(beats: CMBeat[]): Promise<BeatTag[]> {
    return await this.adapter.getAssignable(beats);
  }
}
