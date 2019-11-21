/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { BeatTag } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { FrameworkUser } from '../framework/adapter_types';
import { CMTagsAdapter } from './adapter_types';

export class ElasticsearchTagsAdapter implements CMTagsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(user: FrameworkUser, ESQuery?: any): Promise<BeatTag[]> {
    const params = {
      ignore: [404],
      _source: true,
      size: 10000,
      index: INDEX_NAMES.BEATS,
      body: {
        query: {
          bool: {
            must: {
              term: {
                type: 'tag',
              },
            },
          },
        },
      },
    };
    if (ESQuery) {
      params.body.query = {
        ...params.body.query,
        ...ESQuery,
      };
    }
    const response = await this.database.search(user, params);
    const tags = get<any>(response, 'hits.hits', []);

    return tags.map((tag: any) => ({ hasConfigurationBlocksTypes: [], ...tag._source.tag }));
  }

  public async delete(user: FrameworkUser, tagIds: string[]): Promise<boolean> {
    const ids = tagIds.map(tag => tag);

    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      body: {
        query: {
          terms: { 'beat.tags': tagIds },
        },
      },
    };

    const beatsResponse = await this.database.search(user, params);

    const beats = get<BeatTag[]>(beatsResponse, 'hits.hits', []).map(
      (beat: any) => beat._source.beat
    );

    const inactiveBeats = beats.filter(beat => beat.active === false);
    const activeBeats = beats.filter(beat => beat.active === true);
    if (activeBeats.length !== 0) {
      return false;
    }
    const beatIds = inactiveBeats.map((beat: BeatTag) => beat.id);

    // While we block tag deletion when on an active beat, we should remove from inactive
    const bulkInactiveBeatsUpdates = flatten(
      beatIds.map(beatId => {
        const script = `
        def beat = ctx._source.beat;
        if (beat.tags != null) {
          beat.tags.removeAll([params.tag]);
        }`;

        return flatten(
          ids.map(tagId => [
            { update: { _id: `beat:${beatId}` } },
            { script: { source: script.replace('          ', ''), params: { tagId } } },
          ])
        );
      })
    );

    const bulkTagsDelete = ids.map(tagId => ({ delete: { _id: `tag:${tagId}` } }));

    await this.database.bulk(user, {
      body: flatten([...bulkInactiveBeatsUpdates, ...bulkTagsDelete]),
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
    });

    return true;
  }

  public async getTagsWithIds(user: FrameworkUser, tagIds: string[]): Promise<BeatTag[]> {
    if (tagIds.length === 0) {
      return [];
    }
    const ids = tagIds.map(tag => `tag:${tag}`);

    const params = {
      ignore: [404],
      _source: true,
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
    };
    const response = await this.database.mget(user, params);

    return get(response, 'docs', [])
      .filter((b: any) => b.found)
      .map((b: any) => ({
        hasConfigurationBlocksTypes: [],
        ...b._source.tag,
        id: b._id.replace('tag:', ''),
      }));
  }

  public async upsertTag(user: FrameworkUser, tag: BeatTag): Promise<string> {
    const body = {
      tag,
      type: 'tag',
    };

    const params = {
      body,
      id: `tag:${tag.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
    };
    const response = await this.database.index(user, params);

    return get<string>(response, 'result');
  }

  public async getWithoutConfigTypes(
    user: FrameworkUser,
    blockTypes: string[]
  ): Promise<BeatTag[]> {
    const body = {
      query: {
        bool: {
          filter: {
            match: {
              type: 'tag',
            },
          },
          must_not: {
            terms: { 'tag.hasConfigurationBlocksTypes': blockTypes },
          },
        },
      },
    };

    const params = {
      body,
      index: INDEX_NAMES.BEATS,
      ignore: [404],
      _source: true,
      size: 10000,
    };
    const response = await this.database.search(user, params);
    const tags = get<any>(response, 'hits.hits', []);

    return tags.map((tag: any) => ({ hasConfigurationBlocksTypes: [], ...tag._source.tag }));
  }
}
