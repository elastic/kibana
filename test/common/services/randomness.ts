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

import Chance from 'chance';

import { FtrProviderContext } from '../ftr_provider_context';

interface CharOptions {
  pool?: string;
  alpha?: boolean;
  numeric?: boolean;
  symbols?: boolean;
  casing?: 'lower' | 'upper';
}

interface StringOptions extends CharOptions {
  length?: number;
}

interface NumberOptions {
  min?: number;
  max?: number;
}

export function RandomnessProvider({ getService }: FtrProviderContext) {
  const log = getService('log');

  const seed = Date.now();
  log.debug('randomness seed: %j', seed);

  const chance = new Chance(seed);

  return new (class RandomnessService {
    /**
     * Generate a random natural number
     *
     *  range: 0 to 9007199254740991
     *
     */
    naturalNumber(options?: NumberOptions) {
      return chance.natural(options);
    }

    /**
     * Generate a random integer
     */
    integer(options?: NumberOptions) {
      return chance.integer(options);
    }

    /**
     * Generate a random number, defaults to at least 4 and no more than 8 syllables
     */
    word(options: { syllables?: number } = {}) {
      const { syllables = this.naturalNumber({ min: 4, max: 8 }) } = options;

      return chance.word({
        syllables,
      });
    }

    /**
     * Generate a random string, defaults to at least 8 and no more than 15 alpha-numeric characters
     */
    string(options: StringOptions = {}) {
      return chance.string({
        length: this.naturalNumber({ min: 8, max: 15 }),
        ...(options.pool === 'undefined' ? { alpha: true, numeric: true, symbols: false } : {}),
        ...options,
      });
    }
  })();
}
