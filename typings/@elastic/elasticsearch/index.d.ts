/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * This file contains additional typings for the @elastic/elasticsearch client.
 * These types are not (yet) in the client itself. Some of them are deliberately
 * left out of the client for now, since we don't have proper ways to auto generate
 * them. See https://github.com/elastic/kibana/issues/27396 for a discussion.
 */

declare module '@elastic/elasticsearch' {
  export interface ShardsResponse {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  }

  export interface Explanation {
    value: number;
    description: string;
    details: Explanation[];
  }

  export interface SearchResponse<T> {
    took: number;
    timed_out: boolean;
    _scroll_id?: string;
    _shards: ShardsResponse;
    hits: {
      total: number;
      max_score: number;
      hits: Array<{
        _index: string;
        _type: string;
        _id: string;
        _score: number;
        _source: T;
        _version?: number;
        _explanation?: Explanation;
        fields?: any;
        highlight?: any;
        inner_hits?: any;
        matched_queries?: string[];
        sort?: string[];
      }>;
    };
    aggregations?: any;
  }

  export interface MSearchResponse<T> {
    responses?: Array<SearchResponse<T>>;
  }
}

// We need this so TypeScript doesn't overwrite the typings from the @elastic/elasticsearch library with this file.
export {};
