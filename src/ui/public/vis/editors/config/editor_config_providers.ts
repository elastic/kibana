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

function greatestCommonDivisor(a: number, b: number): number {
  return a === 0 ? b : greatestCommonDivisor(b % a, a);
}

function leastCommonMultiple(a: number, b: number) {
  return a * b / greatestCommonDivisor(a, b);
}

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
    return this.mergeConfigs(configs);
  }

  private mergeConfigs(configs: EditorConfig[]): EditorConfig {
    return configs.reduce((output, conf) => {
      Object.entries(conf).forEach(([paramName, paramConfig]) => {
        if (!output[paramName]) {
          // No other config had anything configured for that param, just
          // use the whole config for that param as it is.
          output[paramName] = paramConfig;
        } else {
          // Another config already had already configured something, so let's merge that
          // If one config set it to hidden, we'll hide the param.
          output[paramName].hidden = output[paramName].hidden || paramConfig.hidden;

          // In case a base is defined either set it (if no previous base)
          // has been configured for that param or otherwise find the least common multiple
          if (paramConfig.base) {
            const previousBase = output[paramName].base;
            output[paramName].base =
              previousBase !== undefined
                ? leastCommonMultiple(previousBase, paramConfig.base)
                : output[paramName].base;
          }

          // TODO: What to do for multiple fixedValues
          output[paramName].fixedValue = paramConfig.fixedValue;
        }
      });
      return output;
    }, {});
  }
}

const editorConfigProviders = new EditorConfigProviderRegistry();

export { editorConfigProviders };
