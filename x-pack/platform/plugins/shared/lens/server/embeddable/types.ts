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

import type { LensRuntimeState } from '../../public';
import type { DOC_TYPE } from '../../common/constants';

export type LensEmbeddableStateWithType = EmbeddableStateWithType &
  LensRuntimeState & {
    type: typeof DOC_TYPE;
  };

export type LensEmbeddableRegistryDefinition =
  EmbeddableRegistryDefinition<LensEmbeddableStateWithType>;
