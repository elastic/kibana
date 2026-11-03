/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { get } from 'lodash';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { PluginConfig } from '../../../config';

/**
 * Dot-notation paths into `T` (both intermediate objects and leaves). Recurses
 * only into plain record types, so schema leaves that happen to be class
 * instances (e.g. `ByteSizeValue`) are treated as leaves.
 */
type ConfigPath<T> = {
  [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
    ? K | `${K}.${ConfigPath<T[K]>}`
    : K;
}[Extract<keyof T, string>];

/** The value type at dot-notation path `P` in `T`. */
type ConfigValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ConfigValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * Resolves the alerting v2 plugin configuration once and exposes it through a
 * typed, path-based `get`, so consumers depend on the specific config values
 * they need rather than on the raw `PluginInitializer('config')` accessor or the
 * whole config object.
 */
@injectable()
export class ConfigService {
  readonly #config: PluginConfig;

  constructor(
    @inject(PluginInitializer('config'))
    configAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.#config = configAccessor.get<PluginConfig>();
  }

  /**
   * Reads a config value by dot-notation path, e.g.
   * `get('retention.alertActions.dispatcher')` or `get('rules.run.alerts.max')`.
   */
  public get<P extends ConfigPath<PluginConfig>>(path: P): ConfigValue<PluginConfig, P> {
    return get(this.#config, path) as ConfigValue<PluginConfig, P>;
  }
}
