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

import { AggConfig } from '../..';
import { AggType } from '../../../agg_types';
import { IndexPattern } from '../../../index_patterns';
import { EditorConfig } from './types';

type EditorConfigProvider = (
  aggType: AggType,
  indexPattern: IndexPattern,
  aggConfig: AggConfig
) => EditorConfig;

class EditorConfigProviderRegistry {
  private providers: Set<EditorConfigProvider> = new Set();

  public register(configProvider: EditorConfigProvider): void {
    this.providers.add(configProvider);
  }

  public getConfigForAgg(
    aggType: AggType,
    indexPattern: IndexPattern,
    aggConfig: AggConfig
  ): EditorConfig {
    const configs = Array.from(this.providers).map(provider =>
      provider(aggType, indexPattern, aggConfig)
    );
    // TODO: merge configs in a reasonable way
    return configs[0];
  }
}

const editorConfigProviders = new EditorConfigProviderRegistry();

export { editorConfigProviders };
