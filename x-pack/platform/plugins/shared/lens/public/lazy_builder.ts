/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Class } from 'utility-types';

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';

import { getLensFeatureFlags } from './get_feature_flags';
import type { LensFeatureFlags } from '../common';

const [getBuilder, setBuilder] = createGetterSetter<LensConfigBuilder>('LensBuilder', false);

/**
 * Retrieves the Lens builder
 */
export function getLensBuilder(): LensConfigBuilder | null {
  const builder = getBuilder();
  const flags = getLensFeatureFlags();

  if (!builder && flags.apiFormat) {
    // only throw if the feature flag is enabled and the builder is null
    throw new Error('Lens builder not initialized');
  }

  return builder;
}

let resultPromise: Promise<{
  LensConfigBuilder: Class<LensConfigBuilder>;
}> | null = null;

export async function setLensBuilder(
  useApiFormat: LensFeatureFlags['apiFormat']
): Promise<LensConfigBuilder | null> {
  if (useApiFormat) {
    resultPromise = import('@kbn/lens-embeddable-utils');
    const { LensConfigBuilder } = await resultPromise;
    const builder = new LensConfigBuilder(undefined, useApiFormat);
    setBuilder(builder);
    resultPromise = null;
    return builder;
  }

  return null;
}

export async function ensureBuilderIsInitialized(): Promise<void> {
  if (resultPromise) {
    await resultPromise;
  }
}
