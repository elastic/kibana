/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
