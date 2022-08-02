/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chance from 'chance';
import { ToolingLog } from '@kbn/tooling-log';

import { FtrService } from '../ftr_provider_context';

let __CACHED_SEED__: number | undefined;
function getSeed(log: ToolingLog) {
  if (__CACHED_SEED__ !== undefined) {
    return __CACHED_SEED__;
  }

  __CACHED_SEED__ = Date.now();
  log.debug('randomness seed: %j', __CACHED_SEED__);
  return __CACHED_SEED__;
}

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

export class RandomnessService extends FtrService {
  private readonly chance = new Chance(getSeed(this.ctx.getService('log')));

  /**
   * Generate a random natural number
   *
   *  range: 0 to 9007199254740991
   *
   */
  naturalNumber(options?: NumberOptions) {
    return this.chance.natural(options);
  }

  /**
   * Generate a random integer
   */
  integer(options?: NumberOptions) {
    return this.chance.integer(options);
  }

  /**
   * Generate a random number, defaults to at least 4 and no more than 8 syllables
   */
  word(options: { syllables?: number } = {}) {
    const { syllables = this.naturalNumber({ min: 4, max: 8 }) } = options;

    return this.chance.word({
      syllables,
    });
  }

  /**
   * Generate a random string, defaults to at least 8 and no more than 15 alpha-numeric characters
   */
  string(options: StringOptions = {}) {
    return this.chance.string({
      length: this.naturalNumber({ min: 8, max: 15 }),
      ...(options.pool === 'undefined' ? { alpha: true, numeric: true, symbols: false } : {}),
      ...options,
    });
  }
}
