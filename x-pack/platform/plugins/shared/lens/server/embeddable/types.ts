/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EmbeddableRegistryDefinition,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/server';

import type { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { LensRuntimeState } from '../../public';

export type LensEmbeddableStateWithType = EmbeddableStateWithType &
  LensRuntimeState & {
    type: typeof LENS_EMBEDDABLE_TYPE;
  };

export type LensEmbeddableRegistryDefinition =
  EmbeddableRegistryDefinition<LensEmbeddableStateWithType>;
